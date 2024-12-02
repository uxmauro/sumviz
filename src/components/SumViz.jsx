import "./Sumviz.css";
import { useState } from "react";
import { LucidePlus, LucideMinus } from "lucide-react";
import ResizableColumn from "./ResizableColumn";
import logoMark from "../assets/logo-mark.svg";

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
        <div style={{"display": "flex", "alignItems": "center", "gap": ".5rem"}}> 
  
      <img src={logoMark} alt="SumViz" width={28} height={28} />

          <h1 style={{"letter-spacing": "-0.12em"}}>SumViz</h1>
          </div>
        <div className="toggleBtn">
          {isActive ? <LucideMinus size={20} /> : <LucidePlus size={20} />}
        </div>
      </div>
      {isActive ? <ResizableColumn /> : ""}
    </div>
  );
};

export default SumViz;
