const MAX_CHARACTERS = 4000;
const MAX_CHUNK_SIZE = 3500;

async function getLangOptionsWithLink(videoId) {
    try {
        console.log('Fetching video page for ID:', videoId);
        const videoPageResponse = await fetch("https://www.youtube.com/watch?v=" + videoId);
        if (!videoPageResponse.ok) {
            throw new Error(`Failed to fetch video page: ${videoPageResponse.status}`);
        }
        
        const videoPageHtml = await videoPageResponse.text();
        console.log('Video page HTML length:', videoPageHtml.length);

        const splittedHtml = videoPageHtml.split('"captions":');
        if (splittedHtml.length < 2) {
            console.log('No captions found in HTML');
            return [];
        }
        
        const captionsSection = splittedHtml[1].split(',"videoDetails')[0].replace("\n", "");
        console.log('Captions JSON:', captionsSection);

        const captions_json = JSON.parse(captionsSection);
        const captionTracks = captions_json.playerCaptionsTracklistRenderer.captionTracks;
        
        const options = captionTracks.map((track) => ({
            language: track.name.simpleText,
            link: track.baseUrl
        }));
        
        console.log('Available caption tracks:', options);
        return options;
    } catch (error) {
        console.error('Error fetching language options:', error);
        return [];
    }
}

async function parseXMLText(xmlText) {
    console.log('Raw XML text length:', xmlText.length);
    console.log('First 500 chars of XML:', xmlText.substring(0, 500));
    
    const segments = [];
    // Match complete <text> elements with their attributes and content
    const textElementRegex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([^<]+)<\/text>/g;
    
    let match;
    let count = 0;
    
    while ((match = textElementRegex.exec(xmlText)) !== null) {
        count++;
        const [_, start, duration, text] = match;
        
        if (count <= 5) {
            console.log('Processing segment:', {
                start,
                duration,
                text: text.substring(0, 50) + (text.length > 50 ? '...' : '')
            });
        }
        
        const processedText = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
        
        if (processedText) {
            segments.push({
                start: parseFloat(start),
                duration: parseFloat(duration),
                text: processedText
            });
        }
    }
    
    console.log('Total segments found:', count);
    console.log('Number of parsed segments:', segments.length);
    console.log('First few segments:', segments.slice(0, 3));
    return segments;
}

async function getRawTranscript(link) {
    try {
        console.log('Fetching transcript from:', link);
        const transcriptPageResponse = await fetch(link);
        const transcriptPageXml = await transcriptPageResponse.text();
        return await parseXMLText(transcriptPageXml);
    } catch (error) {
        console.error('Error fetching raw transcript:', error);
        throw error;
    }
}

// Helper function to get video ID from a transcript link
function getVideoIdFromLink(link) {
    try {
        const url = new URL(link);
        const videoId = url.searchParams.get('v');
        return videoId;
    } catch (error) {
        console.error('Error extracting video ID:', error);
        return null;
    }
}

async function getSmartSegments(link) {
    try {
        const videoId = getVideoIdFromLink(link);
        if (!videoId) {
            throw new Error('Could not extract video ID from link');
        }

        // Check if we already have this transcript
        const stored = await chrome.storage.local.get(`transcript_${videoId}`);
        if (stored[`transcript_${videoId}`]) {
            console.log('Using stored transcript');
            return stored[`transcript_${videoId}`].segments;
        }

        const rawTranscript = await getRawTranscript(link);
        console.log('Total raw transcript segments:', rawTranscript.length);
        
        // Parameters for combining segments
        const MAX_GAP = 2.0;
        const TARGET_DURATION = 35.0;
        
        let combinedSegments = [];
        let currentChunk = null;
        
        for (const segment of rawTranscript) {
            if (!currentChunk) {
                currentChunk = {
                    start: segment.start,
                    duration: segment.duration,
                    text: segment.text,
                    endTime: segment.start + segment.duration
                };
                continue;
            }
            
            const gap = segment.start - currentChunk.endTime;
            const wouldExceedTarget = (segment.start + segment.duration - currentChunk.start) > TARGET_DURATION;
            
            if (gap > MAX_GAP || wouldExceedTarget) {
                // Save current chunk and start a new one
                combinedSegments.push({
                    start: currentChunk.start,
                    duration: currentChunk.endTime - currentChunk.start,
                    text: currentChunk.text
                });
                
                currentChunk = {
                    start: segment.start,
                    duration: segment.duration,
                    text: segment.text,
                    endTime: segment.start + segment.duration
                };
            } else {
                // Combine with current chunk
                currentChunk.text += ' ' + segment.text;
                currentChunk.endTime = segment.start + segment.duration;
            }
        }
        
        // Don't forget to add the last chunk
        if (currentChunk) {
            combinedSegments.push({
                start: currentChunk.start,
                duration: currentChunk.endTime - currentChunk.start,
                text: currentChunk.text
            });
        }
        
        console.log('Original segments:', rawTranscript.length);
        console.log('Combined segments:', combinedSegments.length);
        console.log('Sample combined segments:', combinedSegments.slice(0, 3));
        
        // Store the processed transcript
        await chrome.storage.local.set({
            [`transcript_${videoId}`]: {
                segments: combinedSegments,
                timestamp: Date.now(),
                videoId: videoId,
                fullText: combinedSegments.map(seg => seg.text).join(' ')
            }
        });
        
        // Process and summarize the transcript text
        const storedTranscript = await chrome.storage.local.get(`transcript_${videoId}`);
        const processedChunks = summaryPreprocess(storedTranscript[`transcript_${videoId}`].fullText);
        console.log('Processed transcript chunks:', processedChunks);
        
        // Generate and store summaries
        try {
            const summaries = await generateChunkSummaries(processedChunks, videoId);
            console.log('Generated summaries:', summaries);
        } catch (error) {
            console.error('Failed to generate summaries:', error);
        }
        
        return combinedSegments;
    } catch (error) {
        console.error('Error creating smart segments:', error);
        throw error;
    }
}

const splitIntoChunks = (text, chunkSize) => {
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    chunks.push(text.slice(startIndex, startIndex + chunkSize));
    startIndex += chunkSize;
  }

  return chunks;
};

const cleanText = (text) => {
  let cleanedText = text;
  cleanedText = cleanedText.replace(/\b(a|an|the|in|on|at|to|for|of|with|by|from|up|about|into|over|after)\b/gi, "");
  cleanedText = cleanedText.replace(/very|really|extremely|absolutely/gi, "");
  cleanedText = cleanedText.replace(/\s+/g, " ").trim();
  cleanedText = cleanedText.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "");
  cleanedText = cleanedText.replace(/\s*\n\s*/g, " ").trim();
  return cleanedText;
};

const summaryPreprocess = (input) => {
  const cleanedInput = cleanText(input);
  const chunks = splitIntoChunks(cleanedInput, MAX_CHUNK_SIZE);
  return chunks;
};

const checkSummarizerCapabilities = async () => {
  if (!window.ai?.summarizer) {
    console.log("AI Summarization is not supported");
    return false;
  }

  let capabilities = await window.ai.summarizer.capabilities();
  if (
    capabilities.available === "readily" ||
    capabilities.available === "after-download"
  ) {
    return true;
  }

  try {
    await window.ai.summarizer.create();
    capabilities = await window.ai.summarizer.capabilities();
    return capabilities.available !== "no";
  } catch {
    return false;
  }
};

const createSummarizer = async () => {
  if (!(await checkSummarizerCapabilities())) {
    throw new Error("AI Summarization is not supported");
  }

  return window.ai.summarizer.create({
    type: "key-points",
    format: "plain-text",
    length: "short"
  });
};

const generateChunkSummaries = async (chunks, videoId) => {
  try {
    let summaries = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const summarizer = await createSummarizer();
      const summary = await summarizer.summarize(chunk);
      summarizer.destroy();
      summaries.push(summary);
      console.log(`Chunk ${i + 1}/${chunks.length} summarized:`, summary);
    }

    // Save summaries to storage
    await chrome.storage.local.set({
      [`summaries_${videoId}`]: {
        summaries,
        timestamp: Date.now(),
        videoId: videoId
      }
    });

    console.log('All summaries generated and saved for video:', videoId);
    return summaries;
  } catch (error) {
    console.error('Error generating summaries:', error);
    throw error;
  }
};

// Keep track of processed video IDs to avoid duplicate processing
const processedVideos = new Set();

// Function to handle video processing
async function processVideo(tabId, videoId) {
    console.log('Processing video:', videoId);
    try {
        const firstLangOption = await getLangOptionsWithLink(videoId);
        if (!firstLangOption) {
            console.log('No transcript available for video:', videoId);
            return;
        }

        const segments = await getSmartSegments(firstLangOption[0].link);
        
        // Store the transcript
        await chrome.storage.local.set({
            [`transcript_${videoId}`]: segments
        });
        
        console.log('Transcript automatically fetched and stored');
        
        // Notify the content script that the transcript is ready
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab && tab.status === 'complete') {
                await chrome.tabs.sendMessage(tabId, {
                    type: 'TRANSCRIPT_READY',
                    videoId: videoId
                });
                console.log('Transcript ready message sent to content script');
            }
        } catch (error) {
            console.error('Error sending message to content script:', error);
        }
    } catch (error) {
        console.error('Error auto-fetching transcript:', error);
    }
}

// Listen for tab updates to detect when a YouTube video page is loaded
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Check if this is a YouTube video URL
    if (tab.url?.includes('youtube.com/watch')) {
        const videoId = new URL(tab.url).searchParams.get('v');
        const processedKey = `${tabId}-${videoId}`;
        
        // Process if it's a new video or URL parameters changed
        if (videoId && !processedVideos.has(processedKey)) {
            console.log('New video detected:', videoId);
            processedVideos.add(processedKey);
            
            // Only process when the page is fully loaded
            if (changeInfo.status === 'complete') {
                await processVideo(tabId, videoId);
            }
        }
    }

    // Clean up processed videos when leaving YouTube or closing tab
    if (!tab.url?.includes('youtube.com/watch')) {
        const videoIdsToRemove = Array.from(processedVideos)
            .filter(id => id.startsWith(`${tabId}-`));
        videoIdsToRemove.forEach(id => processedVideos.delete(id));
    }
});

// Listen for YouTube's history state changes (client-side navigation)
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
    if (details.url.includes('youtube.com/watch')) {
        const videoId = new URL(details.url).searchParams.get('v');
        const processedKey = `${details.tabId}-${videoId}`;
        
        if (videoId && !processedVideos.has(processedKey)) {
            console.log('History state updated, new video:', videoId);
            processedVideos.add(processedKey);
            await processVideo(details.tabId, videoId);
        }
    }
}, {
    url: [{
        hostEquals: 'www.youtube.com',
        pathContains: 'watch'
    }]
});

// Message handler remains the same
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handleMessage = async () => {
        try {
            switch (request.type) {
                case 'GET_LANG_OPTIONS':
                    console.log('Processing GET_LANG_OPTIONS for video:', request.videoId);
                    const langOptions = await getLangOptionsWithLink(request.videoId);
                    return langOptions;

                case 'GET_TRANSCRIPT':
                    console.log('Processing GET_TRANSCRIPT for link:', request.link);
                    const segments = await getSmartSegments(request.link);
                    return segments;

                case 'GET_STORED_TRANSCRIPT':
                    const stored = await chrome.storage.local.get(`transcript_${request.videoId}`);
                    return stored[`transcript_${request.videoId}`] || null;

                default:
                    throw new Error('Unknown message type');
            }
        } catch (error) {
            console.error('Detailed error in message handler:', {
                message: error.message,
                stack: error.stack,
                requestType: request.type
              });
              throw error;
        }
    };

    handleMessage()
    .then(response => {
        try {
          sendResponse(response);
        } catch (responseError) {
          console.error('Error sending response:', responseError);
        }
      })
      .catch(error => {
        try {
          sendResponse({ error: error.message });
        } catch (sendError) {
          console.error('Error sending error response:', sendError);
        }
      });
    return true; // Keep the message channel open for async response
});