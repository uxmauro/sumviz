import { useState, useEffect } from "react";
import { marked } from "marked";
import { CircleArrowUp , Loader2} from "lucide-react";
import "./ResizableColumn.css";


function PromtContext() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [session, setSession] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!self.ai || !self.ai.languageModel) {
      setErrorMessage(
        `Your browser doesn't support the Prompt API. If you're on Chrome, join the Early Preview Program to enable it.`,
      );
      return;
    }
    initializeSession();
  }, []);

  const initializeSession = async () => {
    const newSession = await self.ai.languageModel.create({
      temperature: 0.7,
      topK: 8,
    });
    setSession(newSession);
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    if (!prompt || !session) return;

    setLoading(true);

    const fullPrompt = context
      ? `Context: ${context}\n\nPrompt: ${prompt.trim()}`
      : prompt.trim();

    const stream = await session.promptStreaming(fullPrompt);
    let fullResponse = "";
    for await (const chunk of stream) {
      fullResponse = chunk.trim();
    }

    setConversation((prevConversation) => [
      ...prevConversation,
      {
        prompt: prompt.trim(),
        context: context,
        response: fullResponse,
      },
    ]);
    setContext("");
    setPrompt("");
    setLoading(false);
  };

  return (
    <div>
      <header>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
      </header>

      <>
        <div className="input-container">
         

         

          <form onSubmit={handlePromptSubmit}>
              <textarea
              className="chat-input-field"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask anything"
              />

              <button id="send-button" type="submit" disabled={loading} className={prompt.trim() ? 'active' : ''}>
                {loading ? "Loading..." :  <CircleArrowUp size={24} />}
               
              </button>

          </form>
        </  div>

        <div className="conversation">
          {loading && <p className="loading">Generating response...</p>}
          {conversation.map((entry, index) => (
            <div key={index} className="conversation-entry">
              {entry.context && (
                <div className="context-section">
                  <h4>Context:</h4>
                  <p>{entry.context}</p>
                </div>
              )}
              <div className="chat-bubble prompt">
                <p>{entry.prompt}</p>
              </div>
              <div className="chat-bubble response">
                <div
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(entry.response),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </>
    </div>
  );
}

export default PromtContext;