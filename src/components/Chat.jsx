const Chat = ({ height, children }) => {
  return (
    <div className="bottom" style={{ height }}>
      {children}
    </div>
  );
};

export default Chat;
