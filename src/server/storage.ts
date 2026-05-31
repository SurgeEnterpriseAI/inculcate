/**
 * Storage abstraction. Default is a Postgres-backed blob store so the document
 * vault works on serverless (Vercel) with no external service or API key.
 * An S3-backed provider is the documented production swap — implement
 * StorageProvider and return it from getStorageProvider().
 */
import { db } from "@/lib/db";

export interface StoredObject {
  data: Buffer;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  readonly name: string;
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

const dbStorageProvider: StorageProvider = {
  name: "db-blob",
  async put(key, data, mimeType) {
    // Copy into a Uint8Array backed by a concrete ArrayBuffer (Prisma's Bytes type).
    const bytes = new Uint8Array(new ArrayBuffer(data.byteLength));
    bytes.set(data);
    await db.fileObject.upsert({
      where: { key },
      update: { data: bytes, mimeType, size: bytes.length },
      create: { key, data: bytes, mimeType, size: bytes.length },
    });
  },
  async get(key) {
    const f = await db.fileObject.findUnique({ where: { key } });
    if (!f) return null;
    return { data: Buffer.from(f.data), mimeType: f.mimeType, size: f.size };
  },
  async delete(key) {
    await db.fileObject.deleteMany({ where: { key } });
  },
};

export function getStorageProvider(): StorageProvider {
  // When STORAGE_PROVIDER=s3 and credentials exist, return an S3 provider here.
  return dbStorageProvider;
}
