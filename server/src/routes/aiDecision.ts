import type { Request, Response } from "express";
import type { RouterObject } from "../../types/router.js";

import { BadRequestError } from "../errors/httpErrors.js";
import { transcribeVoiceToEnglish } from "../lib/sarvam.js";
import { classifyDecisionFromText } from "../lib/geminiDecision.js";
import { invokeIntentMicroservice } from "../lib/intentMicroservice.js";
import { storeQueryAnalytics } from "../lib/queryAnalytics.js";

function parseBase64Audio(audioBase64: string): Buffer {
  const cleaned = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.+-]+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  if (!buffer.length) {
    throw new BadRequestError("audio_base64 is empty or invalid.");
  }
  return buffer;
}

const aiDecisionRouter: RouterObject = {
  path: "/ai/voice-decision",
  functions: [
    {
      method: "post",
      authorization: "optional",
      rateLimit: "strict",
      keyType: "default",
      handler: async (req: Request, res: Response) => {
        const requestStartedAt = Date.now();
        const { audio_base64, mime_type, file_name, session_id, metadata } = req.body as {
          audio_base64?: string;
          mime_type?: string;
          file_name?: string;
          session_id?: string;
          metadata?: Record<string, unknown>;
        };

        if (!audio_base64 || typeof audio_base64 !== "string") {
          throw new BadRequestError("audio_base64 is required.");
        }

        const audioBuffer = parseBase64Audio(audio_base64);
        const mimeType =
          typeof mime_type === "string" && mime_type.trim().length > 0
            ? mime_type
            : "audio/wav";

        const stt = await transcribeVoiceToEnglish(
          typeof file_name === "string" && file_name.trim().length > 0
            ? { audioBuffer, mimeType, fileName: file_name }
            : { audioBuffer, mimeType }
        );

        const decision = await classifyDecisionFromText(stt.translated_text);
        const microservice = await invokeIntentMicroservice({
          decision,
          translatedText: stt.translated_text,
          sourceText: stt.source_text,
          sessionId: session_id,
          metadata,
        });
        const analytics = await storeQueryAnalytics({
          sessionId: session_id,
          channel: "voice",
          rawUserText: stt.source_text,
          normalizedText: stt.translated_text,
          sourceLanguage: stt.source_language,
          translatedTo: stt.target_language,
          decision,
          microservice,
          processingLatencyMs: Date.now() - requestStartedAt,
          metadata,
        });

        res.status(200).json({
          input: {
            source_text: stt.source_text,
            translated_text: stt.translated_text,
            source_language: stt.source_language,
            target_language: stt.target_language,
          },
          decision,
          microservice,
          analytics,
        });
      },
    },
  ],
};

export default aiDecisionRouter;
