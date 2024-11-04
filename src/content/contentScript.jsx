import { createRoot } from "react-dom/client";
import SumViz from "../components/SumViz";

function adjustContainerHeight() {
  const containerStyle = document.querySelector(".sumviz-container");
  if (containerStyle) {
    containerStyle.style.maxHeight = `${window.innerHeight - 160}px`;
  }
}

function insertSumViz() {
  const secondary = document.getElementById("secondary");
  if (secondary) {
    const container = document.createElement("div");
    container.id = "sumviz-container";
    secondary.prepend(container);

    const root = createRoot(container);
    root.render(<SumViz />);
    adjustContainerHeight();

    // Add resize listener
    window.addEventListener("resize", adjustContainerHeight);
  }
}

// Wait for the secondary element to be available
const observer = new MutationObserver((mutations, obs) => {
  const secondary = document.getElementById("secondary");
  if (secondary) {
    insertSumViz();
    obs.disconnect();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Clean up resize listener when extension is disabled/removed
window.addEventListener("unload", () => {
  window.removeEventListener("resize", adjustContainerHeight);
});
