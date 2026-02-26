import { AppError } from "../errors/AppError.js";
import { ENV } from "./env.js";

interface SarvamInput {
  audioBuffer: Buffer;
  mimeType: string;
  fileName?: string;
}

interface SarvamResult {
  source_text: string;
  translated_text: string;
  source_language: string | null;
  target_language: string;
}

function pickString(
  payload: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export async function transcribeVoiceToEnglish(
  input: SarvamInput
): Promise<SarvamResult> {
  const formData = new FormData();
  const audioBytes = new Uint8Array(input.audioBuffer);
  const audioBlob = new Blob([audioBytes], { type: input.mimeType });

  formData.append("file", audioBlob, input.fileName ?? "input-audio.wav");
  formData.append("target_language_code", "en-IN");
  formData.append("translate", "true");

  const response = await fetch(ENV.SARVAM_STT_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": ENV.SARVAM_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(
      `Sarvam STT failed (${response.status}): ${errorText.slice(0, 200)}`,
      502,
      "SARVAM_STT_FAILED"
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const sourceText = pickString(payload, [
    "transcript",
    "text",
    "source_text",
    "input_text",
  ]);
  const translatedText = pickString(payload, [
    "translated_text",
    "translation",
    "english_text",
    "output_text",
    "text",
  ]);
  const sourceLanguage = pickString(payload, [
    "language",
    "source_language",
    "language_code",
    "detected_language",
  ]);

  if (!translatedText) {
    throw new AppError(
      "Sarvam STT response did not include transcribed text.",
      502,
      "SARVAM_BAD_RESPONSE"
    );
  }

  return {
    source_text: sourceText ?? translatedText,
    translated_text: translatedText,
    source_language: sourceLanguage ?? null,
    target_language: "en",
  };
}
