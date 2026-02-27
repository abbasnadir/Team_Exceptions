import crypto from "crypto";
import { ENV } from "./env.js";
import { UnauthorizedError } from "../errors/httpErrors.js";

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64url(input: string): string {
  const restored = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = restored.length % 4 === 0 ? "" : "=".repeat(4 - (restored.length % 4));
  return Buffer.from(restored + pad, "base64").toString("utf8");
}

function sign(data: string) {
  return base64url(crypto.createHmac("sha256", ENV.JWT_SECRET).update(data).digest());
}

export function signAccessToken(payload: Omit<JwtPayload, "exp">): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    })
  );
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new UnauthorizedError("Invalid token.");
  }
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`);
  if (signature !== expected) {
    throw new UnauthorizedError("Invalid token.");
  }

  const payload = JSON.parse(decodeBase64url(body)) as Partial<JwtPayload>;
  if (!payload.sub || !payload.email || !payload.role || !payload.exp) {
    throw new UnauthorizedError("Invalid token payload.");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedError("Token expired.");
  }
  return payload as JwtPayload;
}
