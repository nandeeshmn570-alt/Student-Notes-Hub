const SUBJECT_NAMES = {
  subject1: "Multivariate Calculus, Statistics And Numerical Methods",
  subject2: "Smart Materials For Emerging Technology",
  subject3: "Introduction To AI And Applications",
  subject4: "Introduction To Electrical Engineering",
  subject5: "Python Programming",
  subject6: "Communication Skills",
  subject7: "Indian Constitution And Engineering Ethics"
};

const AI_PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();
const CHAT_MODEL = process.env.AI_CHAT_MODEL || "gpt-4o-mini";

class AIServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AIServiceError";
    this.status = status;
  }
}

function fallbackReply(subject, prompt, noteList) {
  const subjectName = SUBJECT_NAMES[subject] || "this subject";
  const promptText = (prompt || "").trim();
  const promptLower = promptText.toLowerCase();

  if (promptLower.includes("quiz")) {
    return `Here is a 5-question quiz to test your understanding of *${subjectName}*:\n\n`
      + "1. What is the main purpose of smart materials in engineering?\n"
      + "2. Name one key difference between smart materials and conventional passive materials.\n"
      + "3. Give one example of a smart material and the stimulus it responds to.\n"
      + "4. Why are smart materials useful in sensors, actuators, or adaptive structures?\n"
      + "5. Short answer: Explain how a smart material can provide a useful response to an external change.\n\n"
      + "Answer key: 1) to respond to environmental changes in a controlled way, 2) they adapt actively rather than only passively, 3) shape memory alloy responds to heat, 4) they enable responsive and efficient systems, 5) they detect a trigger and convert it into a measurable or useful response.";
  }

  if (["visual", "diagram", "image"].some((word) => promptLower.includes(word))) {
    return `A good visual summary for *${subjectName}* is a simple concept map:\n\n`
      + "- Trigger or input: heat, stress, electric field, light, or pressure\n"
      + "- Smart material: changes its structure, shape, resistance, or color\n"
      + "- Output response: mechanical motion, electrical signal, shape recovery, or self-healing\n"
      + "- Engineering use: sensors, actuators, adaptive structures, and responsive devices\n\n"
      + "This helps you remember the key idea: the material senses a change and reacts in a useful way.";
  }

  return `Here is a clear summary for *${subjectName}*:\n\n`
    + `The central idea is that ${subjectName.toLowerCase()} focuses on understanding how engineered systems respond to real-world conditions, practical applications, and problem-solving in an engineering context. `
    + "You should focus on the core definitions, the key examples, and how the concept connects to everyday engineering use. "
    + `For this topic, a strong revision approach is to learn the definition, one example, one application, and one limitation. Available note context: ${noteList}.`;
}

function getNoteList(noteNames) {
  return noteNames.join(", ") || "No notes have been uploaded for this subject yet.";
}

function buildSystemMessage(subject, retrievalContext, memorySummary, noteList) {
  return [
    `You are the study assistant for ${SUBJECT_NAMES[subject]} (${subject}).`,
    "Give clear, encouraging explanations suitable for an engineering student.",
    "Use the retrieved subject notes and recent conversation history as the grounding context for your answer.",
    "Help with concepts, examples, revision plans, and questions related to this subject.",
    "If a question is outside this subject, say so briefly and redirect to the subject.",
    `Relevant retrieval context: ${retrievalContext || "No specific note files matched the query, so rely on the subject topic and the active conversation."}`,
    `Conversation memory: ${memorySummary || "No earlier conversation context yet."}`,
    `Available note files: ${noteList}`
  ].join(" ");
}

function getGeminiModels(configuredModel) {
  const models = configuredModel ? [configuredModel.trim()] : [];
  for (const model of ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash"]) {
    if (!models.includes(model)) models.push(model);
  }
  return models;
}

async function readProviderError(response) {
  const body = await response.json().catch(() => ({}));
  return body?.error?.message || JSON.stringify(body).slice(0, 180);
}

async function requestGemini(systemMessage, messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIServiceError("GEMINI_API_KEY is not configured", 503);

  let lastError = "";
  for (const model of getGeminiModels(process.env.GEMINI_MODEL)) {
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemMessage }] },
            contents: messages.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }]
            })),
            generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
          })
        }
      );
    } catch {
      throw new AIServiceError("Gemini service could not be reached", 502);
    }

    if (!response.ok) {
      lastError = await readProviderError(response);
      if ([401, 403].includes(response.status)) {
        throw new AIServiceError("GEMINI_API_KEY is invalid or not permitted", 503);
      }
      if (response.status === 429) {
        throw new AIServiceError("Gemini free-tier quota has been exceeded", 429);
      }
      if ([404, 503].includes(response.status)) continue;
      throw new AIServiceError(`Gemini request failed: ${lastError}`, 502);
    }

    const result = await response.json();
    const text = (result.candidates || [])
      .flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text)
      .filter((part) => typeof part === "string" && part.trim())
      .join("")
      .trim();
    if (text) return text;
  }

  if (lastError) throw new AIServiceError(`Gemini request failed: ${lastError}`, 502);
  throw new AIServiceError("Gemini request failed: no response text was returned", 502);
}

async function requestOpenAI(systemMessage, messages) {
  if (!process.env.OPENAI_API_KEY) {
    throw new AIServiceError("AI chat is not configured. Add OPENAI_API_KEY to the server environment.", 503);
  }

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.4,
        max_tokens: 500,
        messages: [{ role: "system", content: systemMessage }, ...messages]
      })
    });
  } catch {
    throw new AIServiceError("The AI service is unavailable right now", 502);
  }

  if (!response.ok) {
    const details = await readProviderError(response);
    if (response.status === 401) {
      throw new AIServiceError("AI chat configuration error: OPENAI_API_KEY is invalid or expired", 503);
    }
    if (response.status === 429) {
      const quotaExceeded = /insufficient_quota|no credits remaining/i.test(details);
      throw new AIServiceError(
        quotaExceeded
          ? "AI chat is unavailable because the OpenAI account has no credits remaining"
          : "AI chat is temporarily rate-limited by the AI provider",
        quotaExceeded ? 402 : 429
      );
    }
    throw new AIServiceError("The AI service is unavailable right now", 502);
  }

  const result = await response.json();
  return (result.choices?.[0]?.message?.content || "").trim();
}

async function generateChatReply({
  subject,
  messages,
  noteNames = [],
  retrievalContext = "",
  memorySummary = ""
}) {
  if (AI_PROVIDER === "gemini" && !process.env.GEMINI_API_KEY) {
    throw new AIServiceError("AI chat is not configured. Add GEMINI_API_KEY to the server environment.", 503);
  }
  if (AI_PROVIDER === "openai" && !process.env.OPENAI_API_KEY) {
    throw new AIServiceError("AI chat is not configured. Add OPENAI_API_KEY to the server environment.", 503);
  }
  if (!["gemini", "openai"].includes(AI_PROVIDER)) {
    throw new AIServiceError(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`, 503);
  }

  const noteList = getNoteList(noteNames);
  const systemMessage = buildSystemMessage(subject, retrievalContext, memorySummary, noteList);
  let reply;
  try {
    reply = AI_PROVIDER === "gemini"
      ? await requestGemini(systemMessage, messages)
      : await requestOpenAI(systemMessage, messages);
  } catch (error) {
    if (
      AI_PROVIDER === "gemini"
      && error instanceof AIServiceError
      && /quota|rate-limited|no longer available/i.test(error.message)
    ) {
      const latestPrompt = messages[messages.length - 1]?.content || "";
      return fallbackReply(subject, latestPrompt, noteList);
    }
    throw error;
  }

  if (!reply) throw new AIServiceError("The AI service returned an empty response", 502);
  return reply;
}

function makePlaceholderVisual(prompt, subjectTitle) {
  const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  })[character]);
  const label = escapeXml((subjectTitle || "Study Visual").slice(0, 60));
  const summary = escapeXml(prompt.slice(0, 120));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#071d32"/><stop offset="100%" stop-color="#0f3d5d"/></linearGradient></defs>
      <rect width="1200" height="720" fill="url(#bg)" rx="28"/>
      <circle cx="1015" cy="110" r="120" fill="#2bb5ff" opacity="0.23"/>
      <circle cx="210" cy="610" r="150" fill="#66d9ff" opacity="0.15"/>
      <rect x="80" y="90" width="1040" height="540" rx="24" fill="#0d2d48" stroke="#75d8ff" stroke-opacity="0.65"/>
      <text x="110" y="170" fill="#dff6ff" font-size="40" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${label}</text>
      <text x="110" y="250" fill="#c9ebff" font-size="26" font-family="Segoe UI, Arial, sans-serif">Core concept</text>
      <rect x="110" y="290" width="230" height="150" rx="18" fill="#1ea8ff" opacity="0.28"/>
      <rect x="385" y="290" width="230" height="150" rx="18" fill="#2bd0ff" opacity="0.25"/>
      <rect x="660" y="290" width="230" height="150" rx="18" fill="#7ee0ff" opacity="0.23"/>
      <rect x="935" y="290" width="150" height="150" rx="18" fill="#2f5a88" opacity="0.9"/>
      <text x="155" y="365" fill="#f0fbff" font-size="20" font-family="Segoe UI, Arial, sans-serif">Trigger</text>
      <text x="435" y="365" fill="#f0fbff" font-size="20" font-family="Segoe UI, Arial, sans-serif">Process</text>
      <text x="705" y="365" fill="#f0fbff" font-size="20" font-family="Segoe UI, Arial, sans-serif">Effect</text>
      <text x="970" y="365" fill="#f0fbff" font-size="20" font-family="Segoe UI, Arial, sans-serif">Result</text>
      <text x="110" y="520" fill="#dfeffb" font-size="26" font-family="Segoe UI, Arial, sans-serif">${summary}</text>
    </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

async function generateGeminiImage(prompt, subjectTitle = "Study visual") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIServiceError("GEMINI_API_KEY is not configured", 503);

  const configuredModel = process.env.GEMINI_IMAGE_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash";
  let lastError = "";
  let lastStatus = 0;
  for (const model of getGeminiModels(configuredModel)) {
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(60_000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Create a clean educational diagram or visual concept for: ${prompt}` }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.4 }
          })
        }
      );
    } catch {
      return makePlaceholderVisual(prompt, subjectTitle);
    }

    if (!response.ok) {
      lastStatus = response.status;
      lastError = await readProviderError(response);
      if ([401, 403].includes(response.status)) {
        throw new AIServiceError("GEMINI_API_KEY cannot access image generation", 503);
      }
      if (response.status === 429) {
        throw new AIServiceError("Gemini image quota has been exceeded", 429);
      }
      continue;
    }

    const result = await response.json();
    const parts = (result.candidates || []).flatMap((candidate) => candidate.content?.parts || []);
    const image = parts.find((part) => part.inlineData?.data)?.inlineData;
    if (image) return `data:${image.mimeType || "image/png"};base64,${image.data}`;
    if (parts.some((part) => part.text)) return makePlaceholderVisual(prompt, subjectTitle);
  }

  if (lastError && lastStatus && ![404, 503].includes(lastStatus)) {
    throw new AIServiceError(`Gemini image request failed: ${lastError}`, 502);
  }
  return makePlaceholderVisual(prompt, subjectTitle);
}

async function generateImage({ subject, prompt }) {
  if (AI_PROVIDER !== "gemini") {
    throw new AIServiceError("Image generation currently requires AI_PROVIDER=gemini", 503);
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new AIServiceError("GEMINI_API_KEY is not configured", 503);
  }

  const imagePrompt = `Educational study illustration for ${SUBJECT_NAMES[subject]}. `
    + `Create a clean, accurate, student-friendly diagram or visual about: ${prompt.trim().slice(0, 500)}. `
    + "Use readable labels, high contrast, and no decorative text paragraphs.";
  return generateGeminiImage(imagePrompt);
}

module.exports = { AIServiceError, generateChatReply, generateImage };
