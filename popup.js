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

  const extractPosts = () => {
    const posts = [];

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

      // Extract reactions count
      let reactionsCount = 0;
      const reactionsElement = parentEl.querySelector('.social-details-social-counts__reactions-count');
      if (reactionsElement) {
        const reactionsText = reactionsElement.innerText.trim();
        if (reactionsText) {
          // Handle "XYZ and 40 others" format
          if (reactionsText.includes(' and ') && reactionsText.includes(' others')) {
            const match = reactionsText.match(/(\d+)\s+others/);
            if (match) {
              reactionsCount = parseInt(match[1]);
            }
          } else {
            // Handle direct number format
            const numberMatch = reactionsText.match(/(\d+)/);
            if (numberMatch) {
              reactionsCount = parseInt(numberMatch[1]);
            }
          }
        }
      }

      // Extract comments count
      let commentsCount = 0;
      const commentsElement = parentEl.querySelector('.social-details-social-counts__comments');
      if (commentsElement) {
        const commentsText = commentsElement.innerText.trim();
        if (commentsText) {
          const match = commentsText.match(/(\d+)\s+comments?/);
          if (match) {
            commentsCount = parseInt(match[1]);
          }
        }
      }

      // Extract reposts count
      let repostsCount = 0;
      const repostsElement = parentEl.querySelector('.social-details-social-counts__item.social-details-social-counts__item--height-two-x.flex-shrink-1.overflow-hidden');
      if (repostsElement) {
        const repostsText = repostsElement.innerText.trim();
        if (repostsText) {
          const match = repostsText.match(/(\d+)\s+reposts?/);
          if (match) {
            repostsCount = parseInt(match[1]);
          }
        }
      }

      // Extract impressions count
      let impressionsCount = 0;
      const impressionsElements = parentEl.querySelectorAll('.ca-entry-point__num-views.t-14');
      if (impressionsElements.length > 0) {
        // Get the first element (impressions)
        const impressionsElement = impressionsElements[0];
        const impressionsText = impressionsElement.innerText.trim();
        if (impressionsText) {
          const match = impressionsText.match(/([\d,]+)\s+impressions?/);
          if (match) {
            // Remove commas and convert to number
            impressionsCount = parseInt(match[1].replace(/,/g, ''));
          }
        }
      }

      posts.push({
        index: index + 1,
        content: cleaned,
        reactions: reactionsCount,
        comments: commentsCount,
        reposts: repostsCount,
        impressions: impressionsCount
      });
    });

    return posts;
  };

  (async () => {
    sendStatus("Slow scrolling started...", "scrolling");

    let allExtractedPosts = [];
    let postContentSet = new Set();

    let totalScrolls = 0;
    let stableTries = 0;
    let maxScrollTries = 300; // prevent infinite loops
    let scrollIncrement = 500;

    while (stableTries < 10 && totalScrolls < maxScrollTries) {
      window.scrollBy(0, scrollIncrement);
      await delay(1200);

      const newlyExtracted = extractPosts();
      let newAdditions = 0;

      newlyExtracted.forEach(post => {
        if (!postContentSet.has(post.content)) {
          postContentSet.add(post.content);
          allExtractedPosts.push(post);
          newAdditions++;
        }
      });

      sendStatus(`Scrolled ${totalScrolls + 1} steps. Total unique posts: ${allExtractedPosts.length}`, "info");

      if (newAdditions === 0) {
        stableTries++;
      } else {
        stableTries = 0;
      }

      totalScrolls++;
    }

    sendStatus(`Scroll complete. ${allExtractedPosts.length} posts extracted. Preparing files...`, "info");

    // JSON
    const jsonBlob = new Blob([JSON.stringify(allExtractedPosts, null, 2)], { type: 'application/json' });
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
    const csvHeader = "Index,Content,Reactions,Comments,Reposts,Impressions\n";
    const csvRows = allExtractedPosts.map((post, i) => 
      `${i + 1},${escapeCSV(post.content)},${post.reactions},${post.comments},${post.reposts},${post.impressions}`
    );
    const csvBlob = new Blob([csvHeader + csvRows.join("\n")], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = 'All_Your_LinkedIn_Posts.csv';
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);

    sendStatus(`Done. ${allExtractedPosts.length} posts extracted. Files downloaded successfully.`, "success");
  })();
}
