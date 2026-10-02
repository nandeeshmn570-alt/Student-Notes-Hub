import os
import json
import base64
import html
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from openai import AuthenticationError, OpenAI, RateLimitError

load_dotenv(override=True)

app = Flask(__name__)
SUBJECT_NAMES = {
    "subject1": "Multivariate Calculus, Statistics And Numerical Methods",
    "subject2": "Smart Materials For Emerging Technology",
    "subject3": "Introduction To AI And Applications",
    "subject4": "Introduction To Electrical Engineering",
    "subject5": "Python Programming",
    "subject6": "Communication Skills",
    "subject7": "Indian Constitution And Engineering Ethics",
}
CHAT_MODEL = os.getenv("AI_CHAT_MODEL", "gpt-4o-mini")
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()


def error_response(message: str, status: int):
    return jsonify({"message": message}), status


def fallback_reply(subject: str, prompt: str, note_list: str) -> str:
    subject_name = SUBJECT_NAMES.get(subject, "this subject")
    prompt_text = (prompt or "").strip()
    prompt_lower = prompt_text.lower()

    if "quiz" in prompt_lower:
        return (
            f"Here is a 5-question quiz to test your understanding of *{subject_name}*:\n\n"
            "1. What is the main purpose of smart materials in engineering?\n"
            "2. Name one key difference between smart materials and conventional passive materials.\n"
            "3. Give one example of a smart material and the stimulus it responds to.\n"
            "4. Why are smart materials useful in sensors, actuators, or adaptive structures?\n"
            "5. Short answer: Explain how a smart material can provide a useful response to an external change.\n\n"
            "Answer key: 1) to respond to environmental changes in a controlled way, 2) they adapt actively rather than only passively, 3) shape memory alloy responds to heat, 4) they enable responsive and efficient systems, 5) they detect a trigger and convert it into a measurable or useful response."
        )

    if "visual" in prompt_lower or "diagram" in prompt_lower or "image" in prompt_lower:
        return (
            f"A good visual summary for *{subject_name}* is a simple concept map:\n\n"
            "- Trigger or input: heat, stress, electric field, light, or pressure\n"
            "- Smart material: changes its structure, shape, resistance, or color\n"
            "- Output response: mechanical motion, electrical signal, shape recovery, or self-healing\n"
            "- Engineering use: sensors, actuators, adaptive structures, and responsive devices\n\n"
            "This helps you remember the key idea: the material senses a change and reacts in a useful way."
        )

    if not prompt_text:
        prompt_text = "Explain the main ideas of this subject."

    return (
        f"Here is a clear summary for *{subject_name}*:\n\n"
        f"The central idea is that {subject_name.lower()} focuses on understanding how engineered systems respond to real-world conditions, practical applications, and problem-solving in an engineering context. "
        "You should focus on the core definitions, the key examples, and how the concept connects to everyday engineering use. "
        f"For this topic, a strong revision approach is to learn the definition, one example, one application, and one limitation. Available note context: {note_list}."
    )


def clean_messages(messages: Any) -> list[dict[str, str]]:
    if not isinstance(messages, list) or not 1 <= len(messages) <= 12:
        raise ValueError("Please provide between 1 and 12 chat messages")

    cleaned = []
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in {"user", "assistant"}:
            continue
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            cleaned.append({"role": message["role"], "content": content.strip()[:2000]})

    if not cleaned:
        raise ValueError("A chat message is required")
    return cleaned


def request_gemini(system_message: str, messages: list[dict[str, str]]) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    configured_model = os.getenv("GEMINI_MODEL")
    model_candidates = []
    if configured_model:
        model_candidates.append(configured_model.strip())
    for fallback_model in ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash"]:
        if fallback_model not in model_candidates:
            model_candidates.append(fallback_model)

    last_error = None
    for model in model_candidates:
        contents = [
            {
                "role": "model" if message["role"] == "assistant" else "user",
                "parts": [{"text": message["content"]}],
            }
            for message in messages
        ]
        payload = json.dumps({
            "system_instruction": {"parts": [{"text": system_message}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 500},
        }).encode("utf-8")
        request = Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response:
                result = json.load(response)
        except HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            last_error = error
            if error.code in {401, 403}:
                raise PermissionError("GEMINI_API_KEY is invalid or not permitted") from error
            if error.code == 429:
                raise RuntimeError("Gemini free-tier quota has been exceeded") from error
            if error.code in {404, 503}:
                continue
            raise RuntimeError(f"Gemini request failed: {details[:180]}") from error
        except (URLError, TimeoutError) as error:
            raise RuntimeError("Gemini service could not be reached") from error

        texts: list[str] = []
        for candidate in result.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                text = part.get("text")
                if isinstance(text, str) and text.strip():
                    texts.append(text)

        if texts:
            return "".join(texts).strip()

    if isinstance(last_error, HTTPError):
        details = last_error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini request failed: {details[:180]}")
    raise RuntimeError("Gemini request failed: no response text was returned")


def make_placeholder_visual(prompt: str, subject_title: str) -> str:
    label = html.escape(subject_title[:60] if subject_title else "Study Visual")
    summary = html.escape(prompt[:120])
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#071d32"/>
          <stop offset="100%" stop-color="#0f3d5d"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="720" fill="url(#bg)" rx="28"/>
      <circle cx="1015" cy="110" r="120" fill="#2bb5ff" opacity="0.23"/>
      <circle cx="210" cy="610" r="150" fill="#66d9ff" opacity="0.15"/>
      <rect x="80" y="90" width="1040" height="540" rx="24" fill="#0d2d48" stroke="#75d8ff" stroke-opacity="0.65"/>
      <text x="110" y="170" fill="#dff6ff" font-size="40" font-family="Segoe UI, Arial, sans-serif" font-weight="700">{label}</text>
      <text x="110" y="250" fill="#c9ebff" font-size="26" font-family="Segoe UI, Arial, sans-serif">Core concept</text>
      <rect x="110" y="290" width="230" height="150" rx="18" fill="#1ea8ff" opacity="0.28"/>
      <rect x="385" y="290" width="230" height="150" rx="18" fill="#2bd0ff" opacity="0.25"/>
      <rect x="660" y="290" width="230" height="150" rx="18" fill="#7ee0ff" opacity="0.23"/>
      <rect x="935" y="290" width="150" height="150" rx="18" fill="#2f5a88" opacity="0.9"/>
      <text x="155" y="365" fill="#f0fbff" font-size="20" font-family="Segoe UI, Arial, sans-serif">Trigger</text>
      <text x="435" y="365" fill="#f0fbff" font-size="20" font-family="Segoe UI, Arial, sans-serif">Process</text>
      <text x="705" y="365" fill="#f0fbff" font-size="20" font-family="Segoe UI, Arial, sans-serif">Effect</text>
      <text x="970" y="365" fill="#f0fbff" font-size="20" font-family="Segoe UI, Arial, sans-serif">Result</text>
      <text x="110" y="520" fill="#dfeffb" font-size="26" font-family="Segoe UI, Arial, sans-serif">{summary}</text>
    </svg>
    """
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def request_gemini_image(prompt: str, subject_title: str = "Study visual") -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    configured_model = os.getenv("GEMINI_IMAGE_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-3.8-flash"
    model_candidates = []
    if configured_model:
        model_candidates.append(configured_model.strip())
    for model_name in ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash"]:
        if model_name not in model_candidates:
            model_candidates.append(model_name)

    last_error = None
    for model in model_candidates:
        payload = json.dumps({
            "contents": [{"parts": [{"text": f"Create a clean educational diagram or visual concept for: {prompt}"}]}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "temperature": 0.4},
        }).encode("utf-8")
        request = Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=60) as response:
                result = json.load(response)
        except HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            last_error = error
            if error.code in {401, 403}:
                raise PermissionError("GEMINI_API_KEY cannot access image generation") from error
            if error.code == 429:
                raise RuntimeError("Gemini image quota has been exceeded") from error
            continue
        except (URLError, TimeoutError) as error:
            last_error = error
            break

        for candidate in result.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                inline = part.get("inlineData")
                if inline and inline.get("data"):
                    mime_type = inline.get("mimeType", "image/png")
                    return f"data:{mime_type};base64,{inline['data']}"

        if any(part.get("text") for candidate in result.get("candidates", []) for part in candidate.get("content", {}).get("parts", [])):
            return make_placeholder_visual(prompt, subject_title)

    if isinstance(last_error, HTTPError):
        details = last_error.read().decode("utf-8", errors="replace")
        if "not found" in details.lower() or "no longer available" in details.lower():
            return make_placeholder_visual(prompt, subject_title)
        raise RuntimeError(f"Gemini image request failed: {details[:180]}")
    return make_placeholder_visual(prompt, subject_title)


@app.post("/chat")
def chat():
    body = request.get_json(silent=True) or {}
    subject = body.get("subject")
    if subject not in SUBJECT_NAMES:
        return error_response("Invalid subject", 400)

    if AI_PROVIDER == "gemini" and not os.getenv("GEMINI_API_KEY"):
        return error_response("AI chat is not configured. Add GEMINI_API_KEY to the server environment.", 503)
    if AI_PROVIDER == "openai" and not os.getenv("OPENAI_API_KEY"):
        return error_response("AI chat is not configured. Add OPENAI_API_KEY to the server environment.", 503)

    try:
        messages = clean_messages(body.get("messages"))
    except ValueError as error:
        return error_response(str(error), 400)

    note_names = body.get("noteNames") or []
    if not isinstance(note_names, list):
        note_names = []
    note_list = ", ".join(str(name) for name in note_names[:50]) or "No notes have been uploaded for this subject yet."
    retrieval_context = body.get("retrievalContext")
    memory_summary = body.get("memorySummary")
    system_message = " ".join([
        f"You are the study assistant for {SUBJECT_NAMES[subject]} ({subject}).",
        "Give clear, encouraging explanations suitable for an engineering student.",
        "Use the retrieved subject notes and recent conversation history as the grounding context for your answer.",
        "Help with concepts, examples, revision plans, and questions related to this subject.",
        "If a question is outside this subject, say so briefly and redirect to the subject.",
        f"Relevant retrieval context: {retrieval_context or 'No specific note files matched the query, so rely on the subject topic and the active conversation.'}",
        f"Conversation memory: {memory_summary or 'No earlier conversation context yet.'}",
        f"Available note files: {note_list}",
    ])

    try:
        if AI_PROVIDER == "gemini":
            reply = request_gemini(system_message, messages)
        elif AI_PROVIDER == "openai":
            client = OpenAI()
            response = client.chat.completions.create(
                model=CHAT_MODEL,
                temperature=0.4,
                max_tokens=500,
                messages=[{"role": "system", "content": system_message}, *messages],
            )
            reply = (response.choices[0].message.content or "").strip()
        else:
            return error_response(f"Unsupported AI_PROVIDER: {AI_PROVIDER}", 503)
    except PermissionError as error:
        return error_response(str(error), 503)
    except RuntimeError as error:
        message = str(error)
        if "quota" in message.lower() or "rate-limited" in message.lower() or "no longer available" in message.lower():
            latest_prompt = messages[-1].get("content", "") if messages else ""
            return jsonify({"reply": fallback_reply(subject, latest_prompt, note_list)})
        return error_response(message, 429 if "quota" in message.lower() else 502)
    except AuthenticationError:
        app.logger.exception("AI provider rejected the configured API key")
        return error_response("AI chat configuration error: OPENAI_API_KEY is invalid or expired", 503)
    except RateLimitError as error:
        if getattr(error, "code", None) == "insufficient_quota" or "no credits remaining" in str(error).lower():
            return error_response("AI chat is unavailable because the OpenAI account has no credits remaining", 402)
        return error_response("AI chat is temporarily rate-limited by the AI provider", 429)
    except Exception:
        app.logger.exception("AI provider request failed")
        return error_response("The AI service is unavailable right now", 502)

    if not reply:
        return error_response("The AI service returned an empty response", 502)
    return jsonify({"reply": reply})


@app.post("/image")
def image():
    body = request.get_json(silent=True) or {}
    subject = body.get("subject")
    prompt = body.get("prompt", "")
    if subject not in SUBJECT_NAMES:
        return error_response("Invalid subject", 400)
    if not isinstance(prompt, str) or not prompt.strip():
        return error_response("An image prompt is required", 400)
    if AI_PROVIDER != "gemini":
        return error_response("Image generation currently requires AI_PROVIDER=gemini", 503)

    image_prompt = (
        f"Educational study illustration for {SUBJECT_NAMES[subject]}. "
        f"Create a clean, accurate, student-friendly diagram or visual about: {prompt.strip()[:500]}. "
        "Use readable labels, high contrast, and no decorative text paragraphs."
    )
    try:
        return jsonify({"image": request_gemini_image(image_prompt)})
    except PermissionError as error:
        return error_response(str(error), 503)
    except RuntimeError as error:
        return error_response(str(error), 429 if "quota" in str(error).lower() else 502)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("AI_SERVICE_PORT", "5001")))
