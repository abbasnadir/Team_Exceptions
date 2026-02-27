import { BadRequestError } from "../errors/httpErrors.js";

type AllowedAction =
  | "reply"
  | "create_ticket"
  | "escalate_human"
  | "call_microservice"
  | "end";

interface FlowNodeAction {
  type: AllowedAction;
  microservice?: string;
  payload?: Record<string, unknown>;
}

interface FlowConsequence {
  condition: string;
  next_node_id: string;
}

interface FlowNode {
  id: string;
  label?: string;
  condition?: string;
  action: FlowNodeAction;
  consequences: FlowConsequence[];
}

interface FlowDefinition {
  start_node_id: string;
  nodes: FlowNode[];
}

const ALLOWED_ACTIONS = new Set<AllowedAction>([
  "reply",
  "create_ticket",
  "escalate_human",
  "call_microservice",
  "end",
]);

export function validateFlowDefinition(input: unknown): FlowDefinition {
  if (!input || typeof input !== "object") {
    throw new BadRequestError("flow definition must be an object.");
  }

  const payload = input as Record<string, unknown>;
  const startNodeId = payload.start_node_id;
  const nodes = payload.nodes;

  if (typeof startNodeId !== "string" || startNodeId.trim().length === 0) {
    throw new BadRequestError("flow.start_node_id is required.");
  }

  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new BadRequestError("flow.nodes must be a non-empty array.");
  }

  const nodeIds = new Set<string>();

  for (const node of nodes) {
    if (!node || typeof node !== "object") {
      throw new BadRequestError("each node must be an object.");
    }

    const n = node as Record<string, unknown>;
    if (typeof n.id !== "string" || n.id.trim().length === 0) {
      throw new BadRequestError("each node requires id.");
    }
    nodeIds.add(n.id);

    if (!n.action || typeof n.action !== "object") {
      throw new BadRequestError(`node ${n.id} requires action.`);
    }
    const action = n.action as Record<string, unknown>;
    if (typeof action.type !== "string" || !ALLOWED_ACTIONS.has(action.type as AllowedAction)) {
      throw new BadRequestError(
        `node ${n.id} has invalid action.type. Allowed: ${Array.from(ALLOWED_ACTIONS).join(", ")}`
      );
    }

    if (!Array.isArray(n.consequences)) {
      throw new BadRequestError(`node ${n.id} requires consequences array.`);
    }

    for (const consequence of n.consequences) {
      if (!consequence || typeof consequence !== "object") {
        throw new BadRequestError(`node ${n.id} consequence must be object.`);
      }
      const c = consequence as Record<string, unknown>;
      if (typeof c.condition !== "string" || c.condition.trim().length === 0) {
        throw new BadRequestError(`node ${n.id} consequence.condition is required.`);
      }
      if (typeof c.next_node_id !== "string" || c.next_node_id.trim().length === 0) {
        throw new BadRequestError(`node ${n.id} consequence.next_node_id is required.`);
      }
    }
  }

  if (!nodeIds.has(startNodeId)) {
    throw new BadRequestError("flow.start_node_id does not exist in nodes.");
  }

  for (const node of nodes) {
    const n = node as Record<string, unknown>;
    const consequences = n.consequences as Array<Record<string, unknown>>;
    for (const consequence of consequences) {
      const nextNodeId = consequence.next_node_id as string;
      if (!nodeIds.has(nextNodeId)) {
        throw new BadRequestError(
          `node ${String(n.id)} references missing next node: ${nextNodeId}`
        );
      }
    }
  }

  return payload as unknown as FlowDefinition;
}
