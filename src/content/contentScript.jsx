import { createRoot } from "react-dom/client";
import SumViz from "../components/SumViz";

// Debug logging
console.log('Content script loaded');

let currentRoot = null;
let forceRerender = 0; // Add a key to force re-render

function insertSumViz() {
  const secondary = document.getElementById("secondary");
  if (secondary) {
    // Remove existing instance if it exists
    const existingContainer = document.getElementById("sumviz-container");
    if (existingContainer) {
      currentRoot?.unmount();
      existingContainer.remove();
    }

    const container = document.createElement("div");
    container.id = "sumviz-container";
    secondary.prepend(container);

    currentRoot = createRoot(container);
    currentRoot.render(<SumViz key={forceRerender} />);
  }
}

// Function to force UI reload
function reloadUI() {
  forceRerender++; // Increment to force React to create a new instance
  insertSumViz();
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
