import { getDb } from "./mongo.js";
import type { DecisionOutput } from "./geminiDecision.js";
import type { MicroserviceResult } from "./intentMicroservice.js";

interface QueryAnalyticsInput {
  sessionId: string | undefined;
  channel: string;
  rawUserText: string;
  normalizedText: string;
  sourceLanguage: string | null;
  translatedTo: string;
  decision: DecisionOutput;
  microservice: MicroserviceResult;
  processingLatencyMs: number;
  metadata: Record<string, unknown> | undefined;
}

interface QueryAnalyticsResult {
  logged: boolean;
  id: string | null;
  error: string | null;
}

export async function storeQueryAnalytics(
  input: QueryAnalyticsInput
): Promise<QueryAnalyticsResult> {
  const row = {
    session_id: input.sessionId ?? null,
    channel: input.channel,
    query_text_raw: input.rawUserText,
    query_text_normalized: input.normalizedText,
    source_language: input.sourceLanguage,
    translated_to: input.translatedTo,
    intent: input.decision.intent,
    sentiment_score: input.decision.sentiment_score,
    urgency_score: input.decision.urgency_score,
    requires_human: input.decision.requires_human,
    confidence: input.decision.confidence,
    detected_language: input.decision.language,
    routed_service: input.microservice.service,
    routed_action: input.microservice.action,
    service_mode: input.microservice.mode,
    service_status: input.microservice.status,
    processing_latency_ms: input.processingLatencyMs,
    metadata: input.metadata ?? {},
  };

  try {
    const db = await getDb();
    const inserted = await db.collection("query_analytics").insertOne({
      ...row,
      created_at: new Date().toISOString(),
    });
    return {
      logged: true,
      id: inserted.insertedId.toString(),
      error: null,
    };
  } catch (error) {
    return {
      logged: false,
      id: null,
      error: error instanceof Error ? error.message : "Failed to write analytics.",
    };
  }
}
