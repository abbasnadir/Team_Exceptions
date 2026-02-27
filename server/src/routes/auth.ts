import type { Request, Response } from "express";
import type { RouterObject } from "../../types/router.js";
import crypto from "crypto";

import { BadRequestError, UnauthorizedError } from "../errors/httpErrors.js";
import { getDb, serializeId } from "../lib/mongo.js";
import { signAccessToken } from "../lib/token.js";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

const authRouter: RouterObject = {
  path: "/auth",
  functions: [
    {
      method: "post",
      props: "/register",
      authorization: "none",
      rateLimit: "strict",
      keyType: "ip",
      handler: async (req: Request, res: Response) => {
        const { email, password, display_name, account_type, organization_name } = req.body as {
          email?: string;
          password?: string;
          display_name?: string;
          account_type?: "organization" | "user";
          organization_name?: string;
        };

        if (!email || !password) {
          throw new BadRequestError("email and password are required.");
        }

        if (password.length < 8) {
          throw new BadRequestError("password must be at least 8 characters.");
        }

        const normalizedEmail = email.trim().toLowerCase();
        const role = account_type === "organization" ? "organization" : "user";
        if (role === "organization" && !organization_name?.trim()) {
          throw new BadRequestError("organization_name is required for organization account.");
        }

        const db = await getDb();
        const users = db.collection("users");
        const existing = await users.findOne({ email: normalizedEmail });
        if (existing) {
          throw new BadRequestError("Email already exists.");
        }

        const passwordHash = hashPassword(password);
        const now = new Date().toISOString();
        const userDoc = {
          email: normalizedEmail,
          password_hash: passwordHash,
          role,
          display_name: display_name?.trim() || null,
          organization_name: role === "organization" ? organization_name?.trim() || null : null,
          created_at: now,
          updated_at: now,
        };

        const insert = await users.insertOne(userDoc);

        await db.collection("user_accounts").insertOne({
          user_id: insert.insertedId,
          account_type: role,
          display_name: userDoc.display_name,
          phone: null,
          organization_name: userDoc.organization_name,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        const token = signAccessToken({
          sub: insert.insertedId.toString(),
          email: normalizedEmail,
          role,
        });

        res.status(201).json({
          token,
          user: {
            id: insert.insertedId.toString(),
            email: normalizedEmail,
            role,
            display_name: userDoc.display_name,
            organization_name: userDoc.organization_name,
          },
        });
      },
    },
    {
      method: "post",
      props: "/login",
      authorization: "none",
      rateLimit: "strict",
      keyType: "ip",
      handler: async (req: Request, res: Response) => {
        const { email, password } = req.body as {
          email?: string;
          password?: string;
        };

        if (!email || !password) {
          throw new BadRequestError("email and password are required.");
        }

        const normalizedEmail = email.trim().toLowerCase();
        const db = await getDb();
        const users = db.collection("users");
        const user = await users.findOne<{ _id: string; password_hash: string; role: string; email: string }>({
          email: normalizedEmail,
        });

        if (!user) {
          throw new UnauthorizedError("Invalid credentials.");
        }

        const valid = verifyPassword(password, user.password_hash);
        if (!valid) {
          throw new UnauthorizedError("Invalid credentials.");
        }

        const token = signAccessToken({
          sub: user._id.toString(),
          email: user.email,
          role: user.role ?? "user",
        });

        res.status(200).json({
          token,
          user: serializeId(user),
        });
      },
    },
  ],
};

export default authRouter;
