const express = require("express");

const { Note } = require("../models");
const { validateSubject } = require("../middleware/upload");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5001/chat";

function normalizeText(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function buildRetrievalContext(subject, noteEntries, latestMessage) {
  const queryWords = normalizeText(latestMessage).split(" ").filter((word) => word.length > 2);
  if (!Array.isArray(noteEntries) || noteEntries.length === 0) {
    return `No uploaded note files are available yet for ${subject}. Use the subject topic and the current question as the main context.`;
  }

  const rankedNotes = noteEntries
    .map((entry) => {
      const noteText = normalizeText(entry.noteText || "");
      const noteName = normalizeText(entry.originalName || "");
      let score = 0;
      for (const word of queryWords) {
        if (noteText.includes(word)) score += 5;
        if (noteName.includes(word)) score += 3;
      }
      if (noteName.includes(subject)) score += 2;
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (rankedNotes.length > 0) {
    return rankedNotes
      .map((entry) => {
        const snippet = String(entry.noteText || "").replace(/\s+/g, " ").trim();
        const preview = snippet ? snippet.slice(0, 1200) : String(entry.originalName || "");
        return `${entry.originalName || "Note"}: ${preview}`;
      })
      .join("\n\n");
  }

  return noteEntries
    .slice(0, 3)
    .map((entry) => {
      const snippet = String(entry.noteText || "").replace(/\s+/g, " ").trim();
      const preview = snippet ? snippet.slice(0, 800) : String(entry.originalName || "");
      return `${entry.originalName || "Note"}: ${preview}`;
    })
    .join("\n\n");
}

function buildMemorySummary(messages = []) {
  const recent = messages.slice(-8);
  return recent
    .filter((message) => typeof message?.content === "string" && message.content.trim())
    .map((message) => `${message.role}: ${message.content.trim().slice(0, 180)}`)
    .join(" | ");
}

router.post("/chat", asyncHandler(async (req, res) => {
  const { subject, messages, memorySummary } = req.body || {};

  try {
    validateSubject(subject);
  } catch (error) {
    throw new ApiError(400, "Invalid subject");
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
    throw new ApiError(400, "Please provide between 1 and 12 chat messages");
  }

  const safeMessages = messages
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 2000) }))
    .filter((message) => message.content.length > 0);

  if (safeMessages.length === 0) {
    throw new ApiError(400, "A chat message is required");
  }

  let noteEntries = [];
  try {
    const notes = await Note.find({ subject }).select("originalName noteText").sort({ uploadDate: -1 }).lean();
    noteEntries = notes.map((note) => ({
      originalName: note.originalName,
      noteText: note.noteText || ""
    }));
  } catch (error) {
    console.warn("Chat context unavailable because the database is not connected:", error.message);
  }

  const latestUserMessage = safeMessages.filter((message) => message.role === "user").slice(-1)[0]?.content || "";
  const retrievalContext = buildRetrievalContext(subject, noteEntries, latestUserMessage);
  const conversationMemory = memorySummary || buildMemorySummary(safeMessages);

  let response;
  try {
    response = await fetch(AI_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        messages: safeMessages,
        noteNames: noteEntries.map((entry) => entry.originalName),
        retrievalContext,
        memorySummary: conversationMemory
      })
    });
  } catch (error) {
    throw new ApiError(503, "The Python AI service is not running. Start it with: python ai_service.py");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status === 503 ? 503 : 502, payload.message || "The AI service is unavailable right now");
  }

  const reply = payload.reply?.trim();
  if (!reply) {
    throw new ApiError(502, "The AI service returned an empty response");
  }

  res.json({ reply });
}));

router.post("/image", asyncHandler(async (req, res) => {
  const { subject, prompt } = req.body || {};
  try {
    validateSubject(subject);
  } catch (error) {
    throw new ApiError(400, "Invalid subject");
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new ApiError(400, "An image prompt is required");
  }

  let response;
  try {
    response = await fetch(`${AI_SERVICE_URL.replace(/\/chat$/, "")}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, prompt })
    });
  } catch (error) {
    throw new ApiError(503, "The Python AI service is not running. Start it with: python ai_service.py");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload.message || "Image generation failed");
  res.json(payload);
}));

module.exports = router;
