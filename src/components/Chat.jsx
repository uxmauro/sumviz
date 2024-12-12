import { useState, useEffect } from "react";
import { Loader2} from "lucide-react";
import PromptContext from "./PromptContext";

import "./ResizableColumn.css";

const Chat = ({ height }) => {
  const [loading, setLoading] = useState(false);



  return (
    <div className="bottom" style={{ height }}>
      <div className="inner-header">
        <h1>Chat</h1>
      </div>
      <div className="chat-area">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <Loader2 className="animate-spin" />
          </div>
        ) : (
                <>
              <>
          <div className="summary">
            <p>Hello!!!!</p>
              </div>
            </>

            <PromptContext />
</>
        )}
      </div>
    </div>
  );
};

export default Chat;
