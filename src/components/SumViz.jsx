import "./Sumviz.css";
import { useState } from "react";
import { LucidePlus, LucideMinus } from "lucide-react";
import ResizableColumn from "./ResizableColumn";

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
        <div className="toggleBtn">
          {isActive ? <LucideMinus size={20} /> : <LucidePlus size={20} />}
        </div>
      </div>
      {isActive ? <ResizableColumn /> : ""}
    </div>
  );
};

export default SumViz;
