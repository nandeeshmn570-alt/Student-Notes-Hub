import { Note } from "../models.js";
import { validateSubject } from "../middleware/upload.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AIServiceError, generateChatReply, generateImage } from "../utils/aiService.js";

const normalizeText = (value = "") => {
  const lowercaseText = String(value).toLowerCase();
  const textWithoutPunctuation = lowercaseText.replace(/[^a-z0-9\s]/g, " ");
  const textWithSingleSpaces = textWithoutPunctuation.replace(/\s+/g, " ");
  return textWithSingleSpaces.trim();
};

const buildRetrievalContext = (subject, noteEntries, latestMessage) => {
  const allQueryWords = normalizeText(latestMessage).split(" ");
  const queryWords = allQueryWords.filter((word) => word.length > 2);

  if (!Array.isArray(noteEntries) || noteEntries.length === 0) {
    return `No uploaded note files are available yet for ${subject}. Use the subject topic and the current question as the main context.`;
  }

  const rankedNotes = [];
  for (const note of noteEntries) {
    const noteText = normalizeText(note.noteText || "");
    const noteName = normalizeText(note.originalName || "");
    let score = 0;

    for (const word of queryWords) {
      if (noteText.includes(word)) score += 5;
      if (noteName.includes(word)) score += 3;
    }

    if (noteName.includes(subject)) score += 2;
    if (score > 0) rankedNotes.push({ ...note, score });
  }

  rankedNotes.sort((firstNote, secondNote) => secondNote.score - firstNote.score);

  if (rankedNotes.length > 0) {
    const matchingNotes = rankedNotes.slice(0, 3);
    const noteSummaries = [];

    for (const note of matchingNotes) {
      const noteText = String(note.noteText || "").replace(/\s+/g, " ").trim();
      const preview = noteText ? noteText.slice(0, 1200) : String(note.originalName || "");
      noteSummaries.push(`${note.originalName || "Note"}: ${preview}`);
    }

    return noteSummaries.join("\n\n");
  }

  const firstNotes = noteEntries.slice(0, 3);
  const noteSummaries = [];

  for (const note of firstNotes) {
    const noteText = String(note.noteText || "").replace(/\s+/g, " ").trim();
    const preview = noteText ? noteText.slice(0, 800) : String(note.originalName || "");
    noteSummaries.push(`${note.originalName || "Note"}: ${preview}`);
  }

  return noteSummaries.join("\n\n");
};

const buildMemorySummary = (messages = []) => {
  const recentMessages = messages.slice(-8);
  const messageSummaries = [];

  for (const message of recentMessages) {
    if (typeof message?.content !== "string" || !message.content.trim()) continue;

    const shortContent = message.content.trim().slice(0, 180);
    messageSummaries.push(`${message.role}: ${shortContent}`);
  }

  return messageSummaries.join(" | ");
};

const chat = asyncHandler(async (req, res) => {
  const { subject, messages, memorySummary } = req.body || {};

  try {
    validateSubject(subject);
  } catch {
    throw new ApiError(400, "Invalid subject");
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
    throw new ApiError(400, "Please provide between 1 and 12 chat messages");
  }

  const safeMessages = [];
  for (const message of messages) {
    const isAllowedRole = ["user", "assistant"].includes(message?.role);
    const hasTextContent = typeof message?.content === "string";
    if (!isAllowedRole || !hasTextContent) continue;

    const content = message.content.trim().slice(0, 2000);
    if (content) safeMessages.push({ role: message.role, content });
  }

  if (safeMessages.length === 0) {
    throw new ApiError(400, "A chat message is required");
  }

  let noteEntries = [];
  try {
    const notes = await Note.find({ subject })
      .select("originalName noteText")
      .sort({ uploadDate: -1 })
      .lean();

    for (const note of notes) {
      noteEntries.push({
        originalName: note.originalName,
        noteText: note.noteText || ""
      });
    }
  } catch (error) {
    console.warn("Chat context unavailable because the database is not connected:", error.message);
  }

  const userMessages = safeMessages.filter((message) => message.role === "user");
  const latestUserMessage = userMessages[userMessages.length - 1]?.content || "";
  const retrievalContext = buildRetrievalContext(subject, noteEntries, latestUserMessage);
  const conversationMemory = memorySummary || buildMemorySummary(safeMessages);
  const noteNames = [];

  for (const note of noteEntries) {
    noteNames.push(note.originalName);
  }

  let reply;
  try {
    reply = await generateChatReply({
      subject,
      messages: safeMessages,
      noteNames,
      retrievalContext,
      memorySummary: conversationMemory
    });
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw new ApiError(error.status, error.message);
    }
    throw error;
  }

  res.json({ reply });
});

const image = asyncHandler(async (req, res) => {
  const { subject, prompt } = req.body || {};

  try {
    validateSubject(subject);
  } catch {
    throw new ApiError(400, "Invalid subject");
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new ApiError(400, "An image prompt is required");
  }

  let image;
  try {
    image = await generateImage({ subject, prompt });
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw new ApiError(error.status, error.message);
    }
    throw error;
  }

  res.json({ image });
});

export { chat, image };
