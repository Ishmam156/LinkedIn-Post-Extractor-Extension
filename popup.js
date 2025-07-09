function updateStatus(message, type = "info") {
  const status = document.getElementById('status');
  status.innerHTML = message;
  status.className = '';
  status.classList.add(`status-${type}`);
}

const button = document.getElementById('extractBtn');
const originalButtonHTML = button.innerHTML;

document.getElementById('extractBtn').addEventListener('click', async () => {
  updateStatus("Checking current page...", "info");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url || "";

  if (!url.includes("linkedin.com")) {
    updateStatus("Error: This extension only works on linkedin.com.", "error");
    return;
  }

  const activityRegex = /^https:\/\/www\.linkedin\.com\/in\/[^\/]+\/recent-activity\/all\/?$/;

  if (!activityRegex.test(url)) {
    updateStatus("Error: Please go to your LinkedIn 'All activity' page.", "error");
    return;
  }

  // Show spinner and disable button
  button.innerHTML = `<span class="spinner"></span>`;
  button.disabled = true;

  updateStatus("Starting scroll and extraction...", "info");

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractLinkedInPostsWithFeedback,
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "statusUpdate") {
      updateStatus(message.payload, message.level || "info");

      if (message.payload.startsWith("Done.")) {
        button.innerHTML = originalButtonHTML;
        button.disabled = false;
      }
    }
  });
});

function extractLinkedInPostsWithFeedback() {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const sendStatus = (text, level = "info") => {
    chrome.runtime.sendMessage({ type: "statusUpdate", payload: text, level });
  };

  (async () => {
    sendStatus("Scrolling through the page...", "scrolling");

    let lastScrollHeight = 0;
    let attempts = 0;

    while (attempts < 10) {
      window.scrollTo(0, document.body.scrollHeight);
      await delay(800);
      const currentScrollHeight = document.body.scrollHeight;
      if (currentScrollHeight === lastScrollHeight) {
        attempts++;
      } else {
        attempts = 0;
        lastScrollHeight = currentScrollHeight;
      }
    }

    sendStatus("Finished scrolling. Extracting posts...", "info");

    const allPosts = [];

    document.querySelectorAll(
      '.feed-shared-update-v2__control-menu-container.display-flex.flex-column.flex-grow-1'
    ).forEach((parentEl, index) => {
      const contentEl = parentEl.querySelector('.break-words.tvm-parent-container');
      if (!contentEl) return;

      let fullText = contentEl.innerText || "";

      const lines = fullText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== "" && line.toLowerCase() !== "hashtag");

      const mainLines = [];
      const hashtags = [];

      lines.forEach(line => {
        if (/^#\w+/.test(line)) {
          hashtags.push(line);
        } else {
          mainLines.push(line);
        }
      });

      const cleaned = `${mainLines.join('\n\n')}${hashtags.length ? `\n\n${hashtags.join(' ')}` : ''}`;

      allPosts.push({
        index: index + 1,
        content: cleaned
      });
    });

    sendStatus(`Extracted ${allPosts.length} posts. Preparing downloads...`, "info");

    // JSON
    const jsonBlob = new Blob([JSON.stringify(allPosts, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = 'All_Your_LinkedIn_Posts.json';
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    // CSV
    const escapeCSV = (text) => `"${text.replace(/"/g, '""')}"`;
    const csvHeader = "Index,Content\n";
    const csvRows = allPosts.map(post => `${post.index},${escapeCSV(post.content)}`);
    const csvBlob = new Blob([csvHeader + csvRows.join("\n")], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = 'All_Your_LinkedIn_Posts.csv';
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);

    sendStatus(`<strong>${allPosts.length} posts extracted.</strong> Files downloaded successfully.`, "success");

  })();
}
