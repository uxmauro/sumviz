import { useState } from "react";
import { LucidePlus, LucideMinus } from "lucide-react";
import "./ResizableColumn.css";
import TranscriptContent from './TranscriptContent';


const Transcript = ({ height, innerHeight }) => {
  const [isActive, setIsActive] = useState(false);


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
      <div className="transcript-result">{
               <TranscriptContent />
        }</div>
    </div>
  );
};

export default Transcript;
