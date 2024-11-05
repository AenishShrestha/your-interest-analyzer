document.getElementById('analyze').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('results');
    resultsDiv.textContent = 'Analyzing...';
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      if (!tab.url.includes('youtube.com')) {
        resultsDiv.textContent = 'Please navigate to YouTube first!';
        return;
      }
  
      // Inject content script before sending message
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      chrome.tabs.sendMessage(tab.id, { action: 'analyze' }, response => {
        console.log('Received response:', response);
        
        if (chrome.runtime.lastError) {
          resultsDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
          return;
        }
        
        if (response && response.analysis) {
          try {
            const analysis = JSON.parse(response.analysis);
            resultsDiv.textContent = JSON.stringify(analysis, null, 2);
          } catch (e) {
            resultsDiv.textContent = response.analysis;
          }
        } else if (response && response.error) {
          resultsDiv.textContent = `Error: ${response.error}\n\nTechnical details: ${response.technical_details || 'None'}`;
        } else {
          resultsDiv.textContent = 'No response received';
        }
      });
    } catch (error) {
      resultsDiv.textContent = `Error: ${error.message}`;
    }
  });