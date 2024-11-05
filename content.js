async function scrapeYouTubeFeed() {
    console.log('Starting to scrape YouTube feed...');
    const videos = [];
    let lastHeight = 0;
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 5;
    
    while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
      const elements = document.querySelectorAll('ytd-rich-item-renderer');
      console.log(`Found ${elements.length} video elements`);
      
      elements.forEach(element => {
        const titleElement = element.querySelector('#video-title');
        const channelElement = element.querySelector('#channel-name');
        
        if (titleElement && channelElement) {
          videos.push({
            title: titleElement.textContent.trim(),
            channel: channelElement.textContent.trim(),
            views: element.querySelector('#metadata-line')?.textContent.trim() || ''
          });
        }
      });
      
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (document.documentElement.scrollHeight === lastHeight) {
        console.log('Reached end of feed or no more new content');
        break;
      }
      
      lastHeight = document.documentElement.scrollHeight;
      scrollAttempts++;
    }
    
    console.log(`Scraped ${videos.length} videos total`);
    return videos;
  }
  
  async function analyzeInterests(videos) {
    console.log('Starting interest analysis...');
    const GROQ_API_KEY = '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';
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';  // Updated API endpoint
    
    if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY') {
      console.log('No Groq API key set, returning test data');
      return JSON.stringify({
        error: 'Please set your Groq API key in content.js',
        sample_data: {
          videos_scraped: videos.length,
          first_video: videos[0]
        }
      });
    }
    
    const prompt = `Based on these ${videos.length} YouTube videos from a user's homepage, first analyze their interests and viewing patterns in this JSON format for internal processing:
    {
      "main_interests": [
        {
          "category": "string",
          "confidence": "number 0-1",
          "sub_interests": ["string"],
          "evidence": ["string"]
        }
      ],
      "viewing_patterns": {
        "dominant_content_types": ["string"],
        "favorite_channels": ["string"],
        "engagement_levels": {
          "high_engagement_topics": ["string"],
          "moderate_engagement_topics": ["string"]
        }
      },
      "summary": "string"
    }

    Then, rewrite the analysis in this human-readable format:

    📱 YOUR YOUTUBE INTERESTS

    🎯 TOP INTERESTS
    • [List each main interest with its sub-interests]
    
    👀 VIEWING HABITS
    • Most Watched Content: [List dominant content types]
    • Favorite Channels: [List top 3-4 channels]
    
    🔥 HIGH ENGAGEMENT TOPICS
    • [List topics user engages with most]
    
    📊 QUICK SUMMARY
    [A brief, friendly summary of their viewing patterns]`;
    
    try {
      console.log('Sending request to Groq API...');
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: "You are an AI that analyzes YouTube viewing patterns and provides structured insights about user interests."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}. Details: ${await response.text()}`);
      }
      
      const result = await response.json();
      console.log('Received response from Groq API');
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Error analyzing interests:', error);
      return JSON.stringify({ 
        error: 'Failed to analyze interests: ' + error.message,
        technical_details: error.toString(),
        debug_info: {
          api_url: GROQ_API_URL,
          videos_count: videos.length
        }
      });
    }
  }
  
  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'analyze') {
      scrapeYouTubeFeed()
        .then(videos => {
          console.log('Videos scraped successfully');
          return analyzeInterests(videos);
        })
        .then(analysis => {
          console.log('Analysis complete');
          sendResponse({ analysis });
        })
        .catch(error => {
          console.error('Error in analysis pipeline:', error);
          sendResponse({ 
            error: error.message,
            technical_details: error.toString()
          });
        });
      return true;
    }
  });