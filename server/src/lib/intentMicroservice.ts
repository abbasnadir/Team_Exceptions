import { AppError } from "../errors/AppError.js";
import { ENV } from "./env.js";
import type { DecisionOutput, IntentType } from "./geminiDecision.js";

export type ServiceName =
  | "ticketing-service"
  | "reservation-service"
  | "knowledge-service"
  | "payment-service"
  | "support-service";

interface InvocationInput {
  decision: DecisionOutput;
  translatedText: string;
  sourceText: string;
  sessionId: string | undefined;
  metadata: Record<string, unknown> | undefined;
}

export interface MicroserviceResult {
  service: ServiceName;
  mode: "local" | "remote";
  status: "success" | "failed";
  action: string;
  payload: Record<string, unknown>;
}

interface ServiceConfig {
  service: ServiceName;
  action: string;
  remoteUrl: string | undefined;
}

function resolveService(intent: IntentType): ServiceConfig {
  if (intent === "reservation") {
    return {
      service: "reservation-service",
      action: "create_reservation",
      remoteUrl: ENV.RESERVATION_SERVICE_URL,
    };
  }

  if (intent === "inquiry") {
    return {
      service: "knowledge-service",
      action: "knowledge_lookup",
      remoteUrl: ENV.KNOWLEDGE_SERVICE_URL,
    };
  }

  if (intent === "payment") {
    return {
      service: "payment-service",
      action: "payment_support",
      remoteUrl: ENV.PAYMENT_SERVICE_URL,
    };
  }

  if (intent === "support") {
    return {
      service: "support-service",
      action: "general_support",
      remoteUrl: ENV.SUPPORT_SERVICE_URL,
    };
  }

  return {
    service: "ticketing-service",
    action: "create_ticket",
    remoteUrl: ENV.TICKETING_SERVICE_URL,
  };
}

function buildPayload(input: InvocationInput): Record<string, unknown> {
  return {
    session_id: input.sessionId ?? null,
    intent: input.decision.intent,
    confidence: input.decision.confidence,
    sentiment_score: input.decision.sentiment_score,
    urgency_score: input.decision.urgency_score,
    requires_human: input.decision.requires_human,
    detected_language: input.decision.language,
    input_text: input.sourceText,
    normalized_text: input.translatedText,
    metadata: input.metadata ?? {},
  };
}

async function invokeRemoteService(
  service: ServiceConfig,
  payload: Record<string, unknown>
): Promise<MicroserviceResult> {
  const response = await fetch(service.remoteUrl!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(
      `Remote microservice failed (${service.service}, ${response.status}): ${errorText.slice(0, 200)}`,
      502,
      "MICROSERVICE_FAILED"
    );
  }

  let responsePayload: Record<string, unknown> = {};
  try {
    responsePayload = (await response.json()) as Record<string, unknown>;
  } catch {
    responsePayload = {};
  }

  return {
    service: service.service,
    mode: "remote",
    status: "success",
    action: service.action,
    payload: responsePayload,
  };
}

function invokeLocalService(
  service: ServiceConfig,
  payload: Record<string, unknown>
): MicroserviceResult {
  if (service.service === "reservation-service") {
    return {
      service: service.service,
      mode: "local",
      status: "success",
      action: service.action,
      payload: {
        reservation_id: crypto.randomUUID(),
        status: "pending",
        message: "Reservation workflow started.",
        input: payload,
      },
    };
  }

  if (service.service === "knowledge-service") {
    return {
      service: service.service,
      mode: "local",
      status: "success",
      action: service.action,
      payload: {
        lookup_id: crypto.randomUUID(),
        status: "queued",
        message: "Knowledge retrieval started.",
        input: payload,
      },
    };
  }

  if (service.service === "payment-service") {
    return {
      service: service.service,
      mode: "local",
      status: "success",
      action: service.action,
      payload: {
        payment_case_id: crypto.randomUUID(),
        status: "open",
        message: "Payment issue handed to payment workflow.",
        input: payload,
      },
    };
  }

  if (service.service === "support-service") {
    return {
      service: service.service,
      mode: "local",
      status: "success",
      action: service.action,
      payload: {
        support_case_id: crypto.randomUUID(),
        status: "open",
        message: "Support workflow started.",
        input: payload,
      },
    };
  }

  return {
    service: service.service,
    mode: "local",
    status: "success",
    action: service.action,
    payload: {
      ticket_id: crypto.randomUUID(),
      priority:
        typeof payload.urgency_score === "number" && payload.urgency_score > 0.8
          ? "critical"
          : "medium",
      status: "open",
      message: "Ticket created from intent routing.",
      input: payload,
    },
  };
}

export async function invokeIntentMicroservice(
  input: InvocationInput
): Promise<MicroserviceResult> {
  const service = resolveService(input.decision.intent);
  const payload = buildPayload(input);

  if (service.remoteUrl) {
    return invokeRemoteService(service, payload);
  }

  return invokeLocalService(service, payload);
}
