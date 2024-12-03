import React, { useState, useEffect } from 'react';
import { Loader2, Clock } from 'lucide-react';
import "./ResizableColumn.css";


const TranscriptContent = () => {
  const [transcriptData, setTranscriptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);

  // Helper function to format time
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Function to get video ID from YouTube URL
  const getVideoId = (url) => {
    try {
      const urlParams = new URLSearchParams(new URL(url).search);
      return urlParams.get('v');
    } catch (err) {
      console.error('Error getting video ID:', err);
      return null;
    }
  };

  // Function to fetch transcript data
  const fetchTranscript = async (videoId) => {
    try {
      console.log('Fetching transcript for video:', videoId);

      // First check if we have a stored transcript
      const storedTranscript = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'GET_STORED_TRANSCRIPT',
          videoId: videoId
        }, resolve);
      });

      if (storedTranscript) {
        console.log('Using stored transcript');
        setTranscriptData(storedTranscript);
        setLoading(false);
        return;
      }

      // If no stored transcript, proceed with regular fetching
      // Check if chrome.runtime is available
      if (!chrome?.runtime?.sendMessage) {
        throw new Error('Chrome runtime not available');
      }

      // Wrap chrome.runtime.sendMessage in a Promise
      const sendChromeMessage = (message) => {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
      };

      const langOptions = await sendChromeMessage({
        type: 'GET_LANG_OPTIONS',
        videoId: videoId
      });

      console.log('Language options received:', langOptions);

      if (!langOptions || !Array.isArray(langOptions) || langOptions.length === 0) {
        setError('No captions available for this video');
        setLoading(false);
        return;
      }

      const segments = await sendChromeMessage({
        type: 'GET_TRANSCRIPT',
        link: langOptions[0].link
      });


      if (!segments || !Array.isArray(segments)) {
        setError('Invalid transcript data received');
        setLoading(false);
        return;
      }

      setTranscriptData(segments);
    } catch (err) {
      console.error('Failed to load transcript:', err);
      setError('Failed to load transcript: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transcript when component mounts
  useEffect(() => {
    const checkForVideo = () => {
      const url = window.location.href;
      if (url.includes('youtube.com/watch')) {
        const videoId = getVideoId(url);
        if (videoId) {
          console.log('Video ID found:', videoId);
          setLoading(true);
          fetchTranscript(videoId);
        }
      }
    };

    // Listen for TRANSCRIPT_READY messages
    const handleMessage = (message) => {
      if (message.type === 'TRANSCRIPT_READY') {
        console.log('Received TRANSCRIPT_READY message');
        fetchTranscript(message.videoId);
      }
    };

    // Add message listener
    chrome.runtime.onMessage.addListener(handleMessage);

    // Check if we're in a Chrome extension context
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setError('This component must be run within a Chrome extension');
      setLoading(false);
      return;
    }

    checkForVideo();

    // Listen for URL changes
    const observer = new MutationObserver(checkForVideo);
    observer.observe(document.querySelector('title'), { subtree: true, characterData: true });

    // Cleanup listener on unmount
    return () => {
      observer.disconnect();
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Update current time
  useEffect(() => {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      const updateTime = () => {
        setCurrentTime(videoElement.currentTime);
      };
      videoElement.addEventListener('timeupdate', updateTime);
      return () => videoElement.removeEventListener('timeupdate', updateTime);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error}
      </div>
    );
  }

  // Safety check for transcriptData
  if (!transcriptData || !Array.isArray(transcriptData) || transcriptData.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        No transcript data available
      </div>
    );
  }

  return (
    <div className="transcript-content overflow-auto">
      {transcriptData.map((segment, index) => {
        if (!segment || typeof segment.start === 'undefined') return null;
        
        const isCurrentSegment = 
          currentTime >= segment.start && 
          currentTime < (segment.start + segment.duration);
        
          return (
            <div key={index}>
              <div 
                className="time-stamp"
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) {
                    video.currentTime = segment.start;
                  }
                }}
              >
                {formatTime(segment.start)}
                <Clock size={20}/>
              </div>
              <p className='transcript-text'>
                {segment.text}
              </p>
            </div>
          );
      })}
    </div>
  );
};

export default TranscriptContent;