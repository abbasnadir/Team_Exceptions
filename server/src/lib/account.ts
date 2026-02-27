import { ForbiddenError, NotFoundError } from "../errors/httpErrors.js";
import { getDb } from "./mongo.js";

export type AccountType = "organization" | "user";

export interface AccountRow {
  id?: string;
  user_id: string;
  account_type: AccountType;
  display_name: string | null;
  phone: string | null;
  organization_name: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export async function getAccountOrThrow(userId: string): Promise<AccountRow> {
  const db = await getDb();
  const data = await db.collection("user_accounts").findOne<AccountRow>({
    user_id: userId,
    deleted_at: null,
  });

  if (!data) {
    throw new NotFoundError("Account not registered. Call /account/register first.");
  }

  return data;
}

export async function requireOrganizationAccount(userId: string): Promise<AccountRow> {
  const account = await getAccountOrThrow(userId);
  if (account.account_type !== "organization") {
    throw new ForbiddenError("Only organization accounts can manage chatbots/flows.");
  }
  return account;
}
