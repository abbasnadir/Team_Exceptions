import type { Request, Response } from "express";
import type { RouterObject } from "../../types/router.js";

import { BadRequestError, NotFoundError } from "../errors/httpErrors.js";
import { requireOrganizationAccount } from "../lib/account.js";
import { validateFlowDefinition } from "../lib/flowchart.js";
import { getDb, serializeId, serializeIds, toObjectId } from "../lib/mongo.js";

const organizationRouter: RouterObject = {
  path: "/org",
  functions: [
    {
      method: "post",
      props: "/chatbots",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        await requireOrganizationAccount(req.user.id);
        const { name, description } = req.body as {
          name?: string;
          description?: string;
        };

        if (!name || !name.trim()) {
          throw new BadRequestError("chatbot name is required.");
        }

        const db = await getDb();
        const now = new Date().toISOString();
        const insert = await db.collection("chatbots").insertOne({
          owner_user_id: req.user.id,
          name: name.trim(),
          description: description?.trim() || null,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
        const chatbot = await db.collection("chatbots").findOne({ _id: insert.insertedId });
        res.status(201).json({ chatbot: serializeId(chatbot) });
      },
    },
    {
      method: "get",
      props: "/chatbots",
      authorization: "required",
      rateLimit: "read",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        await requireOrganizationAccount(req.user.id);
        const db = await getDb();
        const data = await db
          .collection("chatbots")
          .find({ owner_user_id: req.user.id })
          .sort({ created_at: -1 })
          .toArray();
        res.status(200).json({ items: serializeIds(data) });
      },
    },
    {
      method: "patch",
      props: "/chatbots/:chatbotId",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        await requireOrganizationAccount(req.user.id);
        const { chatbotId } = req.params;
        const { name, description, is_active } = req.body as {
          name?: string;
          description?: string;
          is_active?: boolean;
        };

        if (!chatbotId) {
          throw new BadRequestError("chatbotId is required.");
        }

        const patch: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (typeof name === "string") patch.name = name.trim();
        if (typeof description === "string") patch.description = description.trim() || null;
        if (typeof is_active === "boolean") patch.is_active = is_active;

        const db = await getDb();
        await db.collection("chatbots").updateOne(
          { _id: toObjectId(chatbotId, "chatbotId"), owner_user_id: req.user.id },
          { $set: patch }
        );
        const data = await db.collection("chatbots").findOne({
          _id: toObjectId(chatbotId, "chatbotId"),
          owner_user_id: req.user.id,
        });
        if (!data) throw new NotFoundError("Chatbot not found.");
        res.status(200).json({ chatbot: serializeId(data) });
      },
    },
    {
      method: "delete",
      props: "/chatbots/:chatbotId",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        await requireOrganizationAccount(req.user.id);
        const { chatbotId } = req.params;
        if (!chatbotId) throw new BadRequestError("chatbotId is required.");

        const db = await getDb();
        await db
          .collection("chatbots")
          .deleteOne({ _id: toObjectId(chatbotId, "chatbotId"), owner_user_id: req.user.id });
        res.status(200).json({ success: true });
      },
    },
    {
      method: "post",
      props: "/chatbots/:chatbotId/flows",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        await requireOrganizationAccount(req.user.id);
        const { chatbotId } = req.params;
        const { name, definition, is_active } = req.body as {
          name?: string;
          definition?: unknown;
          is_active?: boolean;
        };
        if (!chatbotId) throw new BadRequestError("chatbotId is required.");
        if (!name || !name.trim()) throw new BadRequestError("flow name is required.");
        const validDefinition = validateFlowDefinition(definition);

        const db = await getDb();
        const chatbot = await db.collection("chatbots").findOne({
          _id: toObjectId(chatbotId, "chatbotId"),
          owner_user_id: req.user.id,
        });
        if (!chatbot) throw new NotFoundError("Chatbot not found.");

        const latestFlow = await db
          .collection("chatbot_flows")
          .find({ chatbot_id: chatbotId })
          .sort({ version: -1 })
          .limit(1)
          .next();

        const nextVersion = ((latestFlow as { version?: number } | null)?.version ?? 0) + 1;

        const now = new Date().toISOString();
        const insert = await db.collection("chatbot_flows").insertOne({
          chatbot_id: chatbotId,
          created_by: req.user.id,
          name: name.trim(),
          version: nextVersion,
          is_active: typeof is_active === "boolean" ? is_active : true,
          definition: validDefinition,
          created_at: now,
          updated_at: now,
        });
        const data = await db.collection("chatbot_flows").findOne({ _id: insert.insertedId });
        res.status(201).json({ flow: serializeId(data) });
      },
    },
    {
      method: "get",
      props: "/chatbots/:chatbotId/flows",
      authorization: "required",
      rateLimit: "read",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        await requireOrganizationAccount(req.user.id);
        const { chatbotId } = req.params;
        if (!chatbotId) throw new BadRequestError("chatbotId is required.");

        const db = await getDb();
        const chatbot = await db.collection("chatbots").findOne({
          _id: toObjectId(chatbotId, "chatbotId"),
          owner_user_id: req.user.id,
        });
        if (!chatbot) throw new NotFoundError("Chatbot not found.");

        const data = await db
          .collection("chatbot_flows")
          .find({ chatbot_id: chatbotId })
          .sort({ version: -1 })
          .toArray();
        res.status(200).json({ items: serializeIds(data) });
      },
    },
    {
      method: "patch",
      props: "/chatbots/:chatbotId/flows/:flowId",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        await requireOrganizationAccount(req.user.id);
        const { chatbotId, flowId } = req.params;
        const { name, definition, is_active } = req.body as {
          name?: string;
          definition?: unknown;
          is_active?: boolean;
        };
        if (!chatbotId || !flowId) throw new BadRequestError("chatbotId and flowId are required.");

        const db = await getDb();
        const chatbot = await db.collection("chatbots").findOne({
          _id: toObjectId(chatbotId, "chatbotId"),
          owner_user_id: req.user.id,
        });
        if (!chatbot) throw new NotFoundError("Chatbot not found.");

        const patch: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (typeof name === "string") patch.name = name.trim();
        if (typeof is_active === "boolean") patch.is_active = is_active;
        if (typeof definition !== "undefined") {
          patch.definition = validateFlowDefinition(definition);
        }

        await db.collection("chatbot_flows").updateOne(
          { _id: toObjectId(flowId, "flowId"), chatbot_id: chatbotId },
          { $set: patch }
        );
        const data = await db.collection("chatbot_flows").findOne({
          _id: toObjectId(flowId, "flowId"),
          chatbot_id: chatbotId,
        });
        if (!data) throw new NotFoundError("Flow not found.");
        res.status(200).json({ flow: serializeId(data) });
      },
    },
    {
      method: "delete",
      props: "/chatbots/:chatbotId/flows/:flowId",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        await requireOrganizationAccount(req.user.id);
        const { chatbotId, flowId } = req.params;
        if (!chatbotId || !flowId) throw new BadRequestError("chatbotId and flowId are required.");

        const db = await getDb();
        const chatbot = await db.collection("chatbots").findOne({
          _id: toObjectId(chatbotId, "chatbotId"),
          owner_user_id: req.user.id,
        });
        if (!chatbot) throw new NotFoundError("Chatbot not found.");

        await db
          .collection("chatbot_flows")
          .deleteOne({ _id: toObjectId(flowId, "flowId"), chatbot_id: chatbotId });

        res.status(200).json({ success: true });
      },
    },
  ],
};

export default organizationRouter;
