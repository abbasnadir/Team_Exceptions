import { AppError } from "../errors/AppError.js";
import { ENV } from "./env.js";

const ALLOWED_INTENTS = new Set([
  "complaint",
  "reservation",
  "inquiry",
  "payment",
  "support",
  "other",
]);

interface DecisionOutput {
  intent:
    | "complaint"
    | "reservation"
    | "inquiry"
    | "payment"
    | "support"
    | "other";
  sentiment_score: number;
  urgency_score: number;
  language: string;
  requires_human: boolean;
  confidence: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function cleanJsonResponse(text: string): string {
  return text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

function parseScore(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(`Gemini output has invalid ${fieldName}.`, 502, "GEMINI_BAD_RESPONSE");
  }
  return value;
}

function validateDecision(payload: Record<string, unknown>): DecisionOutput {
  const intent = payload.intent;
  if (typeof intent !== "string" || !ALLOWED_INTENTS.has(intent)) {
    throw new AppError("Gemini output has invalid intent.", 502, "GEMINI_BAD_RESPONSE");
  }

  const sentimentScore = parseScore(payload.sentiment_score, "sentiment_score");
  if (sentimentScore < -1 || sentimentScore > 1) {
    throw new AppError("sentiment_score must be between -1 and 1.", 502, "GEMINI_BAD_RESPONSE");
  }

  const urgencyScore = parseScore(payload.urgency_score, "urgency_score");
  if (urgencyScore < 0 || urgencyScore > 1) {
    throw new AppError("urgency_score must be between 0 and 1.", 502, "GEMINI_BAD_RESPONSE");
  }

  const confidence = parseScore(payload.confidence, "confidence");
  if (confidence < 0 || confidence > 1) {
    throw new AppError("confidence must be between 0 and 1.", 502, "GEMINI_BAD_RESPONSE");
  }

  const language = payload.language;
  if (typeof language !== "string" || language.trim().length < 2) {
    throw new AppError("Gemini output has invalid language.", 502, "GEMINI_BAD_RESPONSE");
  }

  const requiresHuman = payload.requires_human;
  if (typeof requiresHuman !== "boolean") {
    throw new AppError("Gemini output has invalid requires_human.", 502, "GEMINI_BAD_RESPONSE");
  }

  return {
    intent: intent as DecisionOutput["intent"],
    sentiment_score: sentimentScore,
    urgency_score: urgencyScore,
    language: language.trim().toLowerCase(),
    requires_human: requiresHuman,
    confidence,
  };
}

export async function classifyDecisionFromText(
  inputText: string
): Promise<DecisionOutput> {
  const prompt = `You are an AI decision engine.

Extract:

- intent (one of: complaint, reservation, inquiry, payment, support, other)
- sentiment_score (-1 to +1)
- urgency_score (0 to 1)
- language (ISO code)
- requires_human (true if high anger or complexity)
- confidence (0 to 1)

Return only valid JSON.

User input:
${inputText}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ENV.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(ENV.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(
      `Gemini classification failed (${response.status}): ${errorText.slice(0, 200)}`,
      502,
      "GEMINI_CLASSIFICATION_FAILED"
    );
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new AppError("Gemini response missing output text.", 502, "GEMINI_BAD_RESPONSE");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleanJsonResponse(text)) as Record<string, unknown>;
  } catch {
    throw new AppError("Gemini returned non-JSON output.", 502, "GEMINI_BAD_RESPONSE");
  }

  return validateDecision(parsed);
}
