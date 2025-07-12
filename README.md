# LinkedIn Post Extractor

Extract all your LinkedIn posts and help AI (like ChatGPT) learn your unique writing style!

## Overview

**LinkedIn Post Extractor** is a free, open-source Chrome extension that allows you to download all posts from your LinkedIn profile as JSON and CSV files. This data can then be used to analyze your writing style, generate new post ideas, or assist AI tools in writing posts that sound just like you.

- **No data leaves your computer**: All extraction happens locally. No posts are sent to any server.
- **Easy to use**: Simple step-by-step instructions for non-technical users.
- **Perfect for AI prompting**: Use your exported posts to help ChatGPT or other LLMs generate content in your voice.

## Features

- Download all posts from your LinkedIn profile (when viewing their "All Activity" page)
- Exports data as both JSON and CSV
- No installation required—just load the unpacked extension in Chrome
- 100% local, privacy-first
- Open source

## How to Use

1. **Download the Extension**
   - Download and unzip the extension from this repository (see the [Releases](https://github.com/Ishmam156/linkedin-post-extractor/releases) or the `public/LinkedInAllPostTextExtract.zip` file).

2. **Load in Chrome**
   - Go to `chrome://extensions` in your Chrome browser.
   - Enable "Developer mode" (top right).
   - Click "Load unpacked" and select the unzipped extension folder.

3. **Extract Your Posts**
   - Navigate to your LinkedIn profile's "All Activity" page.
   - Click the extension icon to start extraction. The extension will automatically scroll and download your posts as JSON and CSV files.

4. **Use with AI**
   - Upload your JSON file to ChatGPT or another LLM.
   - Use the following prompt to get personalized post suggestions:

     ```
     Go through the attached JSON file and analyze all my LinkedIn posts. Understand my tone, voice, writing structure, and the topics I speak about. Based on this analysis, suggest the next 3 topics I should post about, including brief summaries of what each post should contain. Make sure the suggestions match my personal writing style and the themes I typically discuss.
     ```

## FAQ

- **Is my data shared?**
  - No, all data stays on your computer. Nothing is sent to any server.
- **Can I edit the exported files?**
  - Yes, JSON can be edited in any text editor, and CSV in Excel/Google Sheets.


## License

MIT. Not affiliated with LinkedIn.
