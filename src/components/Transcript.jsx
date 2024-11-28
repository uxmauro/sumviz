import { useState } from "react";
import { LucidePlus, LucideMinus } from "lucide-react";
import "./ResizableColumn.css";

const Transcript = ({ height, innerHeight, children }) => {
  const [isActive, setIsActive] = useState(false);

  // Toggle function to expand or collapse the div
  const toggleTranscript = () => {
    setIsActive(!isActive);
  };

  return (
    <div className="top" style={{ height }}>
      <div className="inner-header" onClick={toggleTranscript}>
        <h1>Transcript</h1>
        <div className="toggleBtn">
          {isActive ? <LucidePlus size={20} /> : <LucideMinus size={20} />}
        </div>
      </div>
      <div className="transcript-result">{children}</div>
    </div>
  );
};

export default Transcript;
