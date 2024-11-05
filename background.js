chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
  });
async function injectContentScript(tabId) {
try {
    await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
    });
    console.log('Content script injected successfully');
} catch (err) {
    console.error('Failed to inject content script:', err);
}
}