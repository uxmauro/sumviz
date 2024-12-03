import { useState, useEffect } from "react";
import { CircleArrowUp , Loader2} from "lucide-react";
import PrompContext from "./PromptContext";
import "./ResizableColumn.css";

const Chat = ({ height }) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');

  function extractVideoId(url) {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('v');
  }

  const videoId = extractVideoId(window.location.href);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

   // Polling function to check for summary in chrome storage based on videoId
  const checkForSummary = () => {
    if (!videoId) return; // If no videoId is available, skip the check

    chrome.storage.local.get([`summary_${videoId}`], (result) => {
      if (result[`summary_${videoId}`]) {
        setSummary(result[`summary_${videoId}`].summary);
        setLoading(false); // Stop loading once the summary is found
      }
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkForSummary();
    }, 500); // Check every 500ms for the summary

    // Clear the interval when the component is unmounted or the summary is found
    if (!loading) {
      clearInterval(interval);
    }

    return () => clearInterval(interval); // Cleanup on unmount
  }, [loading, videoId]); // Add videoId to the dependency array


  return (
    <div className="bottom" style={{ height }}>
      <div className="inner-header">
        <h1>Chat</h1>
      </div>
      <div className="chat-area">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
                <>
              <>
          {/* <div className="summary">
                <p>{summary}</p>
              </div> */}
            </>
            <PrompContext /></>
        )}
      </div>
    </div>
  );
};

export default Chat;
