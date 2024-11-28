import { useState, useRef } from "react";
import Transcript from "./Transcript";
import Chat from "./Chat";
import Drag from "./Drag";
import "./ResizableColumn.css";

const ResizableColumn = () => {
  const [topHeight, setTopHeight] = useState(50); // Use number for calculations
  const [bottomHeight, setBottomHeight] = useState(50);
  const startY = useRef(null);
  const initialTopHeight = useRef(50);
  const initialBottomHeight = useRef(50);

  const handleMouseDown = (e) => {
    startY.current = e.clientY;
    initialTopHeight.current = topHeight;
    initialBottomHeight.current = bottomHeight;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const delta = e.clientY - startY.current;
    const newTopHeight =
      initialTopHeight.current + (delta / window.innerHeight) * 100;
    const newBottomHeight =
      initialBottomHeight.current - (delta / window.innerHeight) * 100;

    if (newTopHeight >= 10 && newBottomHeight >= 10) {
      // Ensure minimum 10% height
      setTopHeight(newTopHeight);
      setBottomHeight(newBottomHeight);
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="container">
      <Transcript height={`${topHeight}%`} innerHeight={`${topHeight}%`} />
      <Drag onMouseDown={handleMouseDown} />
      <Chat height={`${bottomHeight}%`} />
    </div>
  );
};

export default ResizableColumn;
