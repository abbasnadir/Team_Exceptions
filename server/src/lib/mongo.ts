import crypto from "crypto";
import { ENV } from "./env.js";
import { BadRequestError } from "../errors/httpErrors.js";

type Doc = Record<string, unknown>;

const memoryStore = new Map<string, Doc[]>();

const hasDataApi =
  Boolean(process.env.MONGODB_DATA_API_URL) &&
  Boolean(process.env.MONGODB_DATA_API_KEY) &&
  Boolean(process.env.MONGODB_DATA_SOURCE);

async function dataApi<T>(action: string, collection: string, payload: Record<string, unknown>) {
  const response = await fetch(`${process.env.MONGODB_DATA_API_URL}/action/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": String(process.env.MONGODB_DATA_API_KEY),
    },
    body: JSON.stringify({
      dataSource: process.env.MONGODB_DATA_SOURCE,
      database: ENV.MONGODB_DB_NAME,
      collection,
      ...payload,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mongo Data API failed: ${text}`);
  }
  return (await response.json()) as T;
}

function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, value]) => doc[key] === value);
}

function sortDocs(docs: Doc[], sort: Doc): Doc[] {
  const entries = Object.entries(sort);
  if (!entries.length) return docs;
  return [...docs].sort((a, b) => {
    for (const [field, dir] of entries) {
      const av = a[field];
      const bv = b[field];
      if (av === bv) continue;
      if (typeof dir === "number" && dir < 0) {
        return av! < bv! ? 1 : -1;
      }
      return av! > bv! ? 1 : -1;
    }
    return 0;
  });
}

function projectDocs(docs: Doc[], projection?: Doc) {
  if (!projection) return docs;
  const include = Object.entries(projection)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k);
  if (!include.length) return docs;
  return docs.map((doc) => {
    const out: Doc = {};
    for (const key of include) out[key] = doc[key];
    return out;
  });
}

class MemoryCursor {
  private filter: Doc;
  private sortValue: Doc = {};
  private limitValue = 0;
  private projection?: Doc;
  private readonly collection: string;

  constructor(collection: string, filter: Doc) {
    this.collection = collection;
    this.filter = filter;
  }

  sort(value: Doc) {
    this.sortValue = value;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  project(value: Doc) {
    this.projection = value;
    return this;
  }

  async toArray() {
    const docs = memoryStore.get(this.collection) ?? [];
    const filtered = docs.filter((doc) => matches(doc, this.filter));
    const sorted = sortDocs(filtered, this.sortValue);
    const limited = this.limitValue > 0 ? sorted.slice(0, this.limitValue) : sorted;
    return projectDocs(limited, this.projection);
  }

  async next() {
    const docs = await this.limit(1).toArray();
    return docs[0] ?? null;
  }
}

class MemoryCollection {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  find(filter: Doc = {}) {
    return new MemoryCursor(this.name, filter);
  }

  async findOne<T = Doc>(filter: Doc): Promise<T | null> {
    const docs = memoryStore.get(this.name) ?? [];
    return (docs.find((doc) => matches(doc, filter)) as T | undefined) ?? null;
  }

  async insertOne(doc: Doc) {
    const docs = memoryStore.get(this.name) ?? [];
    const _id = typeof doc._id === "string" ? doc._id : crypto.randomUUID();
    docs.push({ ...doc, _id });
    memoryStore.set(this.name, docs);
    return { insertedId: _id };
  }

  async updateOne(filter: Doc, update: { $set: Doc; $setOnInsert?: Doc }, options?: { upsert?: boolean }) {
    const docs = memoryStore.get(this.name) ?? [];
    const index = docs.findIndex((doc) => matches(doc, filter));
    if (index >= 0) {
      docs[index] = { ...docs[index], ...update.$set };
      memoryStore.set(this.name, docs);
      return { modifiedCount: 1 };
    }
    if (options?.upsert) {
      const newDoc = {
        ...(update.$setOnInsert ?? {}),
        ...filter,
        ...update.$set,
        _id: crypto.randomUUID(),
      };
      docs.push(newDoc);
      memoryStore.set(this.name, docs);
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  async findOneAndUpdate(filter: Doc, update: { $set: Doc }) {
    await this.updateOne(filter, update);
    return this.findOne(filter);
  }

  async deleteOne(filter: Doc) {
    const docs = memoryStore.get(this.name) ?? [];
    const next = docs.filter((doc) => !matches(doc, filter));
    memoryStore.set(this.name, next);
    return { deletedCount: docs.length - next.length };
  }
}

class DataApiCursor {
  private sortValue: Doc = {};
  private limitValue = 0;
  private projection?: Doc;
  private readonly collection: string;
  private readonly filter: Doc;

  constructor(collection: string, filter: Doc) {
    this.collection = collection;
    this.filter = filter;
  }

  sort(value: Doc) {
    this.sortValue = value;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  project(value: Doc) {
    this.projection = value;
    return this;
  }

  async toArray() {
    const result = await dataApi<{ documents: Doc[] }>("find", this.collection, {
      filter: this.filter,
      sort: this.sortValue,
      projection: this.projection,
      limit: this.limitValue > 0 ? this.limitValue : undefined,
    });
    return result.documents ?? [];
  }

  async next() {
    const docs = await this.limit(1).toArray();
    return docs[0] ?? null;
  }
}

class DataApiCollection {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  find(filter: Doc = {}) {
    return new DataApiCursor(this.name, filter);
  }

  async findOne<T = Doc>(filter: Doc): Promise<T | null> {
    const result = await dataApi<{ document?: T }>("findOne", this.name, { filter });
    return result.document ?? null;
  }

  async insertOne(doc: Doc) {
    const _id = typeof doc._id === "string" ? doc._id : crypto.randomUUID();
    await dataApi("insertOne", this.name, { document: { ...doc, _id } });
    return { insertedId: _id };
  }

  async updateOne(filter: Doc, update: { $set: Doc; $setOnInsert?: Doc }, options?: { upsert?: boolean }) {
    const updatePayload: Record<string, unknown> = { filter, update: { $set: update.$set } };
    if (options?.upsert) updatePayload.upsert = true;
    if (update.$setOnInsert) (updatePayload.update as Record<string, unknown>).$setOnInsert = update.$setOnInsert;
    const result = await dataApi<{ modifiedCount: number }>("updateOne", this.name, updatePayload);
    return { modifiedCount: result.modifiedCount ?? 0 };
  }

  async findOneAndUpdate(filter: Doc, update: { $set: Doc }) {
    await this.updateOne(filter, update);
    return this.findOne(filter);
  }

  async deleteOne(filter: Doc) {
    const result = await dataApi<{ deletedCount: number }>("deleteOne", this.name, { filter });
    return { deletedCount: result.deletedCount ?? 0 };
  }
}

class DbFacade {
  collection(name: string) {
    return hasDataApi ? new DataApiCollection(name) : new MemoryCollection(name);
  }
}

const db = new DbFacade();

export async function getDb() {
  return db;
}

export function toObjectId(id: string, field = "id"): string {
  if (!id || typeof id !== "string") {
    throw new BadRequestError(`${field} must be a valid id.`);
  }
  return id;
}

export function serializeId<T extends { _id?: string }>(doc: T | null) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id,
  };
}

export function serializeIds<T extends { _id?: string }>(docs: T[]) {
  return docs.map((doc) => serializeId(doc));
}
