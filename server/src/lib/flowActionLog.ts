import { getDb } from "./mongo.js";
import type { DecisionOutput } from "./geminiDecision.js";
import type { MicroserviceResult } from "./intentMicroservice.js";

interface FlowActionLogInput {
  sessionId: string | undefined;
  chatbotId: string | undefined;
  flowId: string | undefined;
  fromNodeId: string | undefined;
  toNodeId: string | undefined;
  decision: DecisionOutput;
  microservice: MicroserviceResult;
  rawInput: string;
  normalizedInput: string;
}

interface FlowActionLogResult {
  logged: boolean;
  id: string | null;
  error: string | null;
}

export async function storeFlowActionLog(
  input: FlowActionLogInput
): Promise<FlowActionLogResult> {
  if (!input.chatbotId || !input.flowId) {
    return { logged: false, id: null, error: null };
  }

  const row = {
    session_id: input.sessionId ?? null,
    chatbot_id: input.chatbotId,
    flow_id: input.flowId,
    from_node_id: input.fromNodeId ?? null,
    to_node_id: input.toNodeId ?? null,
    action_type: input.microservice.action,
    consequence_type:
      input.decision.requires_human || input.decision.intent === "complaint"
        ? "escalate_human"
        : "continue_bot",
    routed_service: input.microservice.service,
    intent: input.decision.intent,
    sentiment_score: input.decision.sentiment_score,
    urgency_score: input.decision.urgency_score,
    input_text: input.rawInput,
    normalized_text: input.normalizedInput,
  };

  try {
    const db = await getDb();
    const inserted = await db.collection("flow_action_logs").insertOne({
      ...row,
      created_at: new Date().toISOString(),
    });
    return { logged: true, id: inserted.insertedId.toString(), error: null };
  } catch (error) {
    return {
      logged: false,
      id: null,
      error: error instanceof Error ? error.message : "Failed to write flow action log.",
    };
  }
}
