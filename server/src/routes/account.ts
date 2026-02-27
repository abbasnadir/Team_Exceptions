import type { Request, Response } from "express";
import type { RouterObject } from "../../types/router.js";

import { BadRequestError, NotFoundError } from "../errors/httpErrors.js";
import type { AccountType } from "../lib/account.js";
import { getDb, serializeId } from "../lib/mongo.js";

const ALLOWED_ACCOUNT_TYPES = new Set<AccountType>(["organization", "user"]);

const accountRouter: RouterObject = {
  path: "/account",
  functions: [
    {
      method: "post",
      props: "/register",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        const { account_type, display_name, phone, organization_name } = req.body as {
          account_type?: AccountType;
          display_name?: string;
          phone?: string;
          organization_name?: string;
        };

        if (!account_type || !ALLOWED_ACCOUNT_TYPES.has(account_type)) {
          throw new BadRequestError("account_type must be 'organization' or 'user'.");
        }

        if (account_type === "organization" && (!organization_name || !organization_name.trim())) {
          throw new BadRequestError("organization_name is required for organization accounts.");
        }

        const payload = {
          user_id: req.user.id,
          account_type,
          display_name: display_name?.trim() || null,
          phone: phone?.trim() || null,
          organization_name:
            account_type === "organization" ? organization_name?.trim() || null : null,
          deleted_at: null,
        };

        const db = await getDb();
        await db.collection("user_accounts").updateOne(
          { user_id: req.user.id },
          { $set: { ...payload, updated_at: new Date().toISOString() }, $setOnInsert: { created_at: new Date().toISOString() } },
          { upsert: true }
        );
        const doc = await db.collection("user_accounts").findOne({ user_id: req.user.id, deleted_at: null });
        res.status(200).json({ account: serializeId(doc) });
      },
    },
    {
      method: "get",
      props: "/me",
      authorization: "required",
      rateLimit: "read",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        const db = await getDb();
        const data = await db.collection("user_accounts").findOne({
          user_id: req.user.id,
          deleted_at: null,
        });
        if (!data) {
          throw new NotFoundError("Account not found. Register first.");
        }

        res.status(200).json({ account: serializeId(data) });
      },
    },
    {
      method: "patch",
      props: "/me",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        const { display_name, phone, organization_name } = req.body as {
          display_name?: string;
          phone?: string;
          organization_name?: string;
        };

        const patch: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (typeof display_name === "string") {
          patch.display_name = display_name.trim() || null;
        }
        if (typeof phone === "string") {
          patch.phone = phone.trim() || null;
        }
        if (typeof organization_name === "string") {
          patch.organization_name = organization_name.trim() || null;
        }

        const db = await getDb();
        await db.collection("user_accounts").findOneAndUpdate(
          { user_id: req.user.id, deleted_at: null },
          { $set: patch },
          { returnDocument: "after" }
        );
        const data = await db.collection("user_accounts").findOne({
          user_id: req.user.id,
          deleted_at: null,
        });
        if (!data) {
          throw new NotFoundError("Account not found.");
        }

        res.status(200).json({ account: serializeId(data) });
      },
    },
    {
      method: "delete",
      props: "/me",
      authorization: "required",
      rateLimit: "strict",
      keyType: "user",
      handler: async (req: Request, res: Response) => {
        const db = await getDb();
        await db
          .collection("user_accounts")
          .updateOne({ user_id: req.user.id, deleted_at: null }, { $set: { deleted_at: new Date().toISOString() } });

        res.status(200).json({ success: true });
      },
    },
  ],
};

export default accountRouter;
