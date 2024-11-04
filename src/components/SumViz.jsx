import "./Sumviz.css";
import { useState } from "react";

const SumViz = () => {
  // State to control the toggle
  const [isActive, setIsActive] = useState(false);

  // Toggle function to expand or collapse the div
  const toggleSumviz = () => {
    setIsActive(!isActive);
  };

  return (
    <div className={`sumviz-container ${isActive ? "isActive" : ""}`}>
      <div className="sumviz-header" onClick={toggleSumviz}>
        <h1>SumViz</h1>
      </div>
    </div>
  );
};

export default SumViz;
