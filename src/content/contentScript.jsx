import { createRoot } from "react-dom/client";
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