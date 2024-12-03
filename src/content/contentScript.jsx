import { createRoot } from "react-dom/client";
import { generateSummary } from './summarizer.js';
import SumViz from "../components/SumViz";



function insertSumViz() {
  const secondary = document.getElementById("secondary");
  if (secondary) {
    const container = document.createElement("div");
    container.id = "sumviz-container";
    secondary.prepend(container);

    const root = createRoot(container);
    root.render(<SumViz />);
  }
}

const getTranscriptText = () => {
  return new Promise((resolve, reject) => {
    // Try to retrieve the transcript text from local storage first
    const storedTranscript = localStorage.getItem('transcriptText');
    
    if (storedTranscript) {
      // If found in local storage, resolve with it
      console.log("Transcript retrieved from local storage.");
      resolve(storedTranscript);
      return;
    }

    // Wait for the transcript to load (increase timeout if needed)
    const timeout = setTimeout(() => {
      // Select all p elements with the class 'transcript-text'
      const transcriptElements = document.querySelectorAll('p.transcript-text');
      if (transcriptElements.length > 0) {
        // Extract the text content of all matched elements
        const transcriptText = Array.from(transcriptElements)
          .map(el => el.innerText.trim())
          .join(' ');

        // Save the transcript to local storage for future use
        localStorage.setItem('transcriptText', transcriptText);

        console.log("Transcript scraped from the page.");
        resolve(transcriptText); // Resolve with the transcript text
      } else {
        console.error("Transcript elements not found.");
        reject("Transcript not found.");
      }
    }, 10000); // 10 seconds timeout

    // If the transcript isn't found after 10 seconds, reject with a timeout error
    setTimeout(() => {
      clearTimeout(timeout); // Clear the timeout
      console.error("Transcript loading timed out.");
      reject("Transcript not found.");
    }, 10000); // 10 seconds total wait time
  });
};






(async () => {
  try {
    const inputText = await getTranscriptText();  // Await the promise to get the transcript text

    // Once you have the inputText, call generateSummary
    await generateSummary(inputText).then(summary => {
      console.log("Generated summary:", summary);
      chrome.storage.local.set({ 'videoSummary': summary }, () => {
        console.log('Summary saved successfully!');
      });
    });
  } catch (error) {
    console.error("Error fetching transcript or generating summary:", error);
  }
})();



// Add message listener for background script communication
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log('Message received in content script:', message);
  if (message.type === 'TRANSCRIPT_READY') {
    console.log('Transcript ready for video:', message.videoId);
    reloadUI(); // Use reloadUI instead of insertSumViz
  } else if (message.type === 'RELOAD_UI') {
    reloadUI();
  }
});


let currentVideoId = null;

function extractVideoId(url) {
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get('v');
}

function detectVideoChange() {
  const currentUrl = window.location.href;
  const videoId = extractVideoId(currentUrl);

  if (videoId && videoId !== currentVideoId) {    
       // Dispatch custom event when video changes
       const event = new CustomEvent('videoChange', { detail: { videoId } });
       window.dispatchEvent(event);

  }
}

function watchRecommendationsSection() {
  const recommendationsSection = document.querySelector('ytd-watch-next-secondary-results-renderer');
  
  if (recommendationsSection) {
    const observer = new MutationObserver((mutations) => {
      // Check if the recommendations have significantly changed
      const hasSubstantialChange = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      );
      
      if (hasSubstantialChange) {
        console.log('Recommendations section updated');
        detectVideoChange();
      }
    });

    observer.observe(recommendationsSection, {
      childList: true,
      subtree: true
    });
  }
}



// Create observer instance to handle initial load
const observer = new MutationObserver((mutations, obs) => {
  const secondary = document.getElementById("secondary");
  if (secondary) {
    insertSumViz();
    obs.disconnect();
  }
});

// Initial setup
observer.observe(document.body, {
  childList: true,
  subtree: true,
});


observer.observe(document.body, {
  childList: true,
  subtree: true,
});

window.addEventListener('popstate', detectVideoChange);
window.addEventListener('pushstate', detectVideoChange);
window.addEventListener('replacestate', detectVideoChange);

// Initial check
detectVideoChange();

// Periodically check for recommendations section
const checkInterval = setInterval(() => {
  watchRecommendationsSection();
  if (document.querySelector('ytd-watch-next-secondary-results-renderer')) {
    clearInterval(checkInterval);
  }
}, 1000);

// Modify history methods to trigger our custom event
(function(history){
    var pushState = history.pushState;
    history.pushState = function(state) {
        if (typeof history.onpushstate == "function") {
            history.onpushstate({state: state});
        }
        return pushState.apply(history, arguments);
    };
})(window.history);