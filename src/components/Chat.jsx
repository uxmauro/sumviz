import { useState } from "react";
import { LucidePlus, LucideMinus, CircleArrowUp } from "lucide-react";
import "./ResizableColumn.css";

const Chat = ({ height, children }) => {

  const [isActive, setIsActive] = useState(false);
  const [inputText, setInputText] = useState('');


  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };


  const toggleChat = () => {
    setIsActive(!isActive);
  };

  return (
    <div className="bottom" style={{ height }}>
          <div className="inner-header" onClick={toggleChat}>
        <h1>Chat</h1>
        {/* <div className="toggleBtn">
          {isActive ? <LucidePlus size={20} /> : <LucideMinus size={20} />}
        </div> */}
      </div>
      <div className="chat-area">
      
      </div>
    <textarea className="chat-input-field"     value={inputText}
        onChange={handleInputChange} type="text" placeholder="Ask anything" />
    <button id="send-button" onClick={() => console.log(inputText)} className={inputText.trim() ? 'active' : ''}
        disabled={!inputText.trim()}><CircleArrowUp size={24} /></button>
    </div>
  );
};

export default Chat;
