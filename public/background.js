

async function getLangOptionsWithLink(videoId) {
    try {
        console.log('Fetching video page for ID:', videoId);
        const videoPageResponse = await fetch(
            "https://www.youtube.com/watch?v=" + videoId
        );
        const videoPageHtml = await videoPageResponse.text();
        console.log('Video page HTML length:', videoPageHtml.length);

        const splittedHtml = videoPageHtml.split('"captions":');
        if (splittedHtml.length < 2) {
            console.log('No captions found in HTML');
            return [];
        }
        
        const captionsSection = splittedHtml[1].split(',"videoDetails')[0].replace("\n", "");
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
    
    const segments = [];
    // Match complete <text> elements with their attributes and content
    const textElementRegex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([^<]+)<\/text>/g;
    
    let match;
    let count = 0;
    
    while ((match = textElementRegex.exec(xmlText)) !== null) {
        count++;
        const [_, start, duration, text] = match;
        
    
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
                fullText: combinedSegments.map(seg => seg.text).join(' ') // This will be useful for chat
            }
        });
        
        return combinedSegments;
    } catch (error) {
        console.error('Error creating smart segments:', error);
        throw error;
    }
}
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
// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
//     // Only proceed if the page has finished loading and it's a YouTube video URL
//     if (tab.url?.includes('youtube.com/watch')) {
//         try {
//             const videoId = getVideoIdFromLink(tab.url);
//             if (!videoId) return;

//             console.log('YouTube video page loaded, fetching transcript for:', videoId);
            
//             // Get available language options
//             const langOptions = await getLangOptionsWithLink(videoId);
//             if (langOptions.length === 0) {
//                 console.log('No captions available for this video');
//                 return;
//             }

//             // Use the first available language option
//             const firstLangOption = langOptions[0];
//             console.log('Auto-fetching transcript in language:', firstLangOption.language);
            
//             // Get the transcript
//             const segments = await getSmartSegments(firstLangOption.link);
            
//             // Store the transcript
//             await chrome.storage.local.set({
//                 [`transcript_${videoId}`]: segments
//             });
            
//             console.log('Transcript automatically fetched and stored');
            
//             // Notify the content script that the transcript is ready
//             chrome.tabs.sendMessage(tabId, {
//                 type: 'TRANSCRIPT_READY',
//                 videoId: videoId
//             });
            
//         } catch (error) {
//             console.error('Error auto-fetching transcript:', error);
//         }
//     }
// });


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
            console.error('Error in message handler:', error);
            throw error;
        }
    };

    handleMessage()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));

    return true; // Keep the message channel open for async response
});