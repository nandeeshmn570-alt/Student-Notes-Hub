import { useEffect, useState } from "react";
import { api } from "../api";

const welcomeMessage = {
  role: "assistant",
  content: "Hi! I can explain concepts, work through examples, or help you build a revision plan for this subject."
};

const suggestedPrompts = [
  "Explain the key ideas",
  "Give me a practice problem",
  "Make a revision plan"
];

const getSavedMessages = (storageKey) => {
  try {
    const savedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return savedMessages.length > 0 ? savedMessages : [welcomeMessage];
  } catch {
    return [welcomeMessage];
  }
};

const createMemorySummary = (messages) => {
  return messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content.slice(0, 160)}`)
    .join(" | ");
};

export const SubjectChat = ({ subject }) => {
  const storageKey = `subject-chat-${subject.id}`;
  const [messages, setMessages] = useState(() => getSavedMessages(storageKey));
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingImage, setIsCreatingImage] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-12)));
  }, [messages, storageKey]);

  const sendToAssistant = async (chatMessages) => {
    setIsSending(true);
    setError("");

    try {
      const recentMessages = chatMessages.slice(-12);
      const memorySummary = createMemorySummary(recentMessages);
      const response = await api.chat(subject.id, recentMessages, memorySummary);
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: response.reply }
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  };

  const addUserMessage = (content) => {
    const updatedMessages = [...messages, { role: "user", content }];
    setMessages(updatedMessages);
    return updatedMessages;
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const messageText = draft.trim();

    if (!messageText || isSending) return;

    setDraft("");
    await sendToAssistant(addUserMessage(messageText));
  };

  const makeQuiz = async () => {
    if (isSending || isCreatingImage) return;

    const quizPrompt = `Create a 5-question quiz about ${subject.title}. Include four multiple-choice questions and one short-answer question. Put the answer key and brief explanations after the questions.`;
    await sendToAssistant(addUserMessage(quizPrompt));
  };

  const makeStudyImage = async () => {
    if (isSending || isCreatingImage) return;

    setIsCreatingImage(true);
    setError("");

    try {
      const imagePrompt = draft.trim()
        || `a visual summary of the core concepts of ${subject.title}`;
      const response = await api.generateImage(subject.id, imagePrompt);
      setImage(response.image);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsCreatingImage(false);
    }
  };

  const startNewChat = () => {
    setMessages([welcomeMessage]);
    setDraft("");
    setError("");
    setImage(null);
  };

  const isBusy = isSending || isCreatingImage;

  return (
    <section className="subject-chat" aria-labelledby="subject-chat-title">
      <div className="subject-chat-heading">
        <div className="chat-title-group">
          <div className="chat-avatar" aria-hidden="true">✦</div>
          <div>
            <div className="chat-title-line">
              <p className="eyebrow">STUDY ASSISTANT</p>
              <span className="chat-status"><i />Online</span>
            </div>
            <h2 id="subject-chat-title">Your subject companion</h2>
            <p>Focused help for {subject.title}.</p>
          </div>
        </div>
        <button
          className="chat-reset"
          type="button"
          onClick={startNewChat}
          disabled={isBusy}
        >
          <span aria-hidden="true">＋</span> New chat
        </button>
      </div>

      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div
            className={`chat-message ${message.role}`}
            key={`${message.role}-${index}`}
          >
            <span className="chat-message-avatar" aria-hidden="true">
              {message.role === "assistant" ? "✦" : "You"}
            </span>
            <p>{message.content}</p>
          </div>
        ))}

        {isSending && (
          <div className="chat-message assistant">
            <span className="chat-message-avatar" aria-hidden="true">✦</span>
            <p className="typing-dots"><i /><i /><i /></p>
          </div>
        )}
      </div>

      {image && (
        <figure className="chat-image-result">
          <img src={image} alt={`Generated study visual for ${subject.title}`} />
          <figcaption>
            Generated study visual
            <button type="button" onClick={() => setImage(null)}>Dismiss</button>
          </figcaption>
        </figure>
      )}

      {messages.length === 1 && !isSending && (
        <div className="chat-suggestions" aria-label="Suggested prompts">
          {suggestedPrompts.map((prompt) => (
            <button
              type="button"
              key={prompt}
              onClick={() => setDraft(prompt)}
            >
              {prompt}<span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      )}

      <div className="chat-actions" aria-label="Study tools">
        <button type="button" onClick={makeQuiz} disabled={isBusy}>
          <span aria-hidden="true">☷</span> Generate quiz
        </button>
        <button type="button" onClick={makeStudyImage} disabled={isBusy}>
          <span aria-hidden="true">◌</span>
          {isCreatingImage ? "Creating visual..." : "Create visual"}
        </button>
      </div>

      {error && <p className="chat-error" role="alert">{error}</p>}

      <form className="chat-form" onSubmit={sendMessage}>
        <label className="visually-hidden" htmlFor="subject-question">
          Ask a question
        </label>
        <div className="chat-input-wrap">
          <textarea
            id="subject-question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask anything about this subject..."
            maxLength={2000}
            rows={2}
            disabled={isSending}
          />
          <span className="chat-character-count">{draft.length}/2000</span>
        </div>
        <button
          className="chat-send"
          type="submit"
          aria-label="Send message"
          disabled={isSending || !draft.trim()}
        >
          <span aria-hidden="true">↑</span>
        </button>
      </form>

      <p className="chat-footer-note">
        <span aria-hidden="true">⌘</span> Subject-aware responses · Check important answers with your notes
      </p>
    </section>
  );
};
