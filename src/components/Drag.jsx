const Drag = ({ onMouseDown }) => {
  return (
    <div id="drag" onMouseDown={onMouseDown}>
      <div className="inner-drag"></div>
    </div>
  );
};

export default Drag;
