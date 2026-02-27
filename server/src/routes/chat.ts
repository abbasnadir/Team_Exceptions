import type { Request, Response } from "express";
import type { RouterObject } from "../../types/router.js";

import { BadRequestError, NotFoundError } from "../errors/httpErrors.js";
import { getDb, serializeIds, toObjectId } from "../lib/mongo.js";
import { classifyDecisionFromText } from "../lib/geminiDecision.js";
import { runFlow } from "../lib/flowRuntime.js";
import { invokeIntentMicroservice } from "../lib/intentMicroservice.js";
import { storeFlowActionLog } from "../lib/flowActionLog.js";
import { storeQueryAnalytics } from "../lib/queryAnalytics.js";

const chatRouter: RouterObject = {
  path: "/chat",
  functions: [
    {
      method: "get",
      props: "/organizations",
      authorization: "none",
      rateLimit: "read",
      keyType: "ip",
      handler: async (_req: Request, res: Response) => {
        const db = await getDb();
        const chatbots = await db
          .collection("chatbots")
          .find({ is_active: true })
          .project({ name: 1, description: 1, owner_user_id: 1 })
          .toArray();
        res.status(200).json({ items: serializeIds(chatbots) });
      },
    },
    {
      method: "post",
      props: "/organizations/:chatbotId/message",
      authorization: "none",
      rateLimit: "strict",
      keyType: "ip",
      handler: async (req: Request, res: Response) => {
        const { chatbotId } = req.params;
        const { message, session_id } = req.body as { message?: string; session_id?: string };
        if (!chatbotId) throw new BadRequestError("chatbotId is required.");
        if (!message || !message.trim()) throw new BadRequestError("message is required.");

        const db = await getDb();
        const chatbot = await db
          .collection("chatbots")
          .findOne({ _id: toObjectId(chatbotId, "chatbotId"), is_active: true });
        if (!chatbot) throw new NotFoundError("Organization chatbot not found.");

        const flow = await db
          .collection("chatbot_flows")
          .find({ chatbot_id: chatbotId, is_active: true })
          .sort({ version: -1 })
          .limit(1)
          .next();
        if (!flow) throw new NotFoundError("No active flow found for this organization.");

        const decision = await classifyDecisionFromText(message.trim());
        const runtime = runFlow(flow.definition, {
          intent: decision.intent,
          sentiment_score: decision.sentiment_score,
          urgency_score: decision.urgency_score,
          requires_human: decision.requires_human,
          confidence: decision.confidence,
          language: decision.language,
          text: message.trim(),
        });

        const microservice = await invokeIntentMicroservice({
          decision,
          translatedText: message.trim(),
          sourceText: message.trim(),
          sessionId: session_id,
          metadata: {
            chatbot_id: chatbotId,
            flow_id: flow._id.toString(),
            runtime_action: runtime.action.type,
          },
        });

        const analytics = await storeQueryAnalytics({
          sessionId: session_id,
          channel: "web_chat",
          rawUserText: message.trim(),
          normalizedText: message.trim(),
          sourceLanguage: decision.language,
          translatedTo: decision.language,
          decision,
          microservice,
          processingLatencyMs: 0,
          metadata: { chatbot_id: chatbotId, flow_id: flow._id.toString() },
        });

        const flowLog = await storeFlowActionLog({
          sessionId: session_id,
          chatbotId: chatbotId,
          flowId: flow._id.toString(),
          fromNodeId: runtime.reached_node_id,
          toNodeId: runtime.next_node_id ?? undefined,
          decision,
          microservice,
          rawInput: message.trim(),
          normalizedInput: message.trim(),
        });

        const actionPayload = runtime.action.payload ?? {};
        const responseText =
          runtime.action.type === "reply" && typeof actionPayload.message === "string"
            ? actionPayload.message
            : runtime.action.type === "escalate_human"
              ? "I am escalating this conversation to a human agent."
              : runtime.action.type === "end"
                ? "Thank you. This conversation has been closed."
                : "Your request is being processed.";

        res.status(200).json({
          chatbot: { id: chatbotId, name: chatbot.name },
          decision,
          flow: {
            flow_id: flow._id.toString(),
            node_id: runtime.reached_node_id,
            action: runtime.action.type,
            next_node_id: runtime.next_node_id,
          },
          response_text: responseText,
          microservice,
          analytics,
          flow_log: flowLog,
        });
      },
    },
  ],
};

export default chatRouter;
