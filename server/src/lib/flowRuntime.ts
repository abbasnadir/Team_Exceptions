import { BadRequestError } from "../errors/httpErrors.js";

type RuntimeContext = Record<string, unknown>;

interface FlowConsequence {
  condition: string;
  next_node_id: string;
}

interface FlowNode {
  id: string;
  label?: string;
  condition?: string;
  action: {
    type: "reply" | "create_ticket" | "escalate_human" | "call_microservice" | "end";
    microservice?: string;
    payload?: Record<string, unknown>;
  };
  consequences: FlowConsequence[];
}

interface FlowDefinition {
  start_node_id: string;
  nodes: FlowNode[];
}

function evaluateExpression(expression: string, context: RuntimeContext): boolean {
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    const fn = new Function(...keys, `return (${expression});`);
    const result = fn(...values);
    return Boolean(result);
  } catch {
    return false;
  }
}

export function runFlow(definition: unknown, context: RuntimeContext) {
  if (!definition || typeof definition !== "object") {
    throw new BadRequestError("Invalid flow definition.");
  }
  const flow = definition as FlowDefinition;
  const nodes = new Map<string, FlowNode>(flow.nodes.map((node) => [node.id, node]));
  let currentNodeId = flow.start_node_id;

  for (let i = 0; i < 20; i += 1) {
    const node = nodes.get(currentNodeId);
    if (!node) {
      break;
    }

    if (node.condition && !evaluateExpression(node.condition, context)) {
      const fallback = node.consequences.find((c) => evaluateExpression(c.condition, context));
      if (!fallback) {
        return { reached_node_id: node.id, action: node.action, next_node_id: null };
      }
      currentNodeId = fallback.next_node_id;
      continue;
    }

    const next = node.consequences.find((c) => evaluateExpression(c.condition, context));
    return {
      reached_node_id: node.id,
      action: node.action,
      next_node_id: next?.next_node_id ?? null,
    };
  }

  throw new BadRequestError("Flow traversal exceeded maximum steps.");
}
