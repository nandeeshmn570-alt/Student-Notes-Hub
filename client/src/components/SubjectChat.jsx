import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const starterMessage = {
  role: "assistant",
  content: "Hi! I can explain concepts, work through examples, or help you build a revision plan for this subject."
};

const promptSuggestions = [
  "Explain the key ideas",
  "Give me a practice problem",
  "Make a revision plan"
];

export function SubjectChat({ subject }) {
  const storageKey = `subject-chat-${subject.id}`;
  const [messages, setMessages] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return stored.length > 0 ? stored : [starterMessage];
    } catch (error) {
      return [starterMessage];
    }
  });
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState(null);
  const [state, setState] = useState({ sending: false, generatingImage: false, error: "" });

  useEffect(() => {
    const trimmed = messages.slice(-12);
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  }, [messages, storageKey]);

  const memorySummary = useMemo(() => messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content.slice(0, 160)}`)
    .join(" | "), [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || state.sending) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setState({ sending: true, generatingImage: false, error: "" });

    try {
      const response = await api.chat(subject.id, nextMessages, memorySummary);
      setMessages((current) => [...current, { role: "assistant", content: response.reply }]);
      setState({ sending: false, generatingImage: false, error: "" });
    } catch (error) {
      setState({ sending: false, generatingImage: false, error: error.message });
    }
  };

  const generateQuiz = async () => {
    if (state.sending || state.generatingImage) return;
    const prompt = `Create a 5-question quiz about ${subject.title}. Include four multiple-choice questions and one short-answer question. Put the answer key and brief explanations after the questions.`;
    const nextMessages = [...messages, { role: "user", content: prompt }];
    setMessages(nextMessages);
    setState({ sending: true, generatingImage: false, error: "" });
    try {
      const response = await api.chat(subject.id, nextMessages, memorySummary);
      setMessages((current) => [...current, { role: "assistant", content: response.reply }]);
      setState({ sending: false, generatingImage: false, error: "" });
    } catch (error) {
      setState({ sending: false, generatingImage: false, error: error.message });
    }
  };

  const generateImage = async () => {
    if (state.sending || state.generatingImage) return;
    setState({ sending: false, generatingImage: true, error: "" });
    try {
      const response = await api.generateImage(subject.id, draft.trim() || `a visual summary of the core concepts of ${subject.title}`);
      setImage(response.image);
      setState({ sending: false, generatingImage: false, error: "" });
    } catch (error) {
      setState({ sending: false, generatingImage: false, error: error.message });
    }
  };

  const resetChat = () => {
    setMessages([starterMessage]);
    setDraft("");
    setState({ sending: false, generatingImage: false, error: "" });
    setImage(null);
  };

  const useSuggestion = (suggestion) => {
    setDraft(suggestion);
  };

  return (
    <section className="subject-chat" aria-labelledby="subject-chat-title">
      <div className="subject-chat-heading">
        <div className="chat-title-group">
          <div className="chat-avatar" aria-hidden="true">✦</div>
          <div>
            <div className="chat-title-line"><p className="eyebrow">STUDY ASSISTANT</p><span className="chat-status"><i />Online</span></div>
            <h2 id="subject-chat-title">Your subject companion</h2>
            <p>Focused help for {subject.title}.</p>
          </div>
        </div>
        <button className="chat-reset" type="button" onClick={resetChat} disabled={state.sending || state.generatingImage}><span aria-hidden="true">＋</span> New chat</button>
      </div>
      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
            <span className="chat-message-avatar" aria-hidden="true">{message.role === "assistant" ? "✦" : "You"}</span>
            <p>{message.content}</p>
          </div>
        ))}
        {state.sending && <div className="chat-message assistant"><span className="chat-message-avatar" aria-hidden="true">✦</span><p className="typing-dots"><i /><i /><i /></p></div>}
      </div>
      {image && <figure className="chat-image-result"><img src={image} alt={`Generated study visual for ${subject.title}`} /><figcaption>Generated study visual <button type="button" onClick={() => setImage(null)}>Dismiss</button></figcaption></figure>}
      {messages.length === 1 && !state.sending && <div className="chat-suggestions" aria-label="Suggested prompts">{promptSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => useSuggestion(suggestion)}>{suggestion}<span aria-hidden="true">↗</span></button>)}</div>}
      <div className="chat-actions" aria-label="Study tools"><button type="button" onClick={generateQuiz} disabled={state.sending || state.generatingImage}><span aria-hidden="true">☷</span> Generate quiz</button><button type="button" onClick={generateImage} disabled={state.sending || state.generatingImage}><span aria-hidden="true">◌</span> {state.generatingImage ? "Creating visual..." : "Create visual"}</button></div>
      {state.error && <p className="chat-error" role="alert">{state.error}</p>}
      <form className="chat-form" onSubmit={sendMessage}>
        <label className="visually-hidden" htmlFor="subject-question">Ask a question</label>
        <div className="chat-input-wrap">
          <textarea id="subject-question" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask anything about this subject..." maxLength={2000} rows={2} disabled={state.sending} />
          <span className="chat-character-count">{draft.length}/2000</span>
        </div>
        <button className="chat-send" type="submit" aria-label="Send message" disabled={state.sending || !draft.trim()}><span aria-hidden="true">↑</span></button>
      </form>
      <p className="chat-footer-note"><span aria-hidden="true">⌘</span> Subject-aware responses · Check important answers with your notes</p>
    </section>
  );
}
