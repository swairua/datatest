import { randomBytes } from "crypto";

interface StoredData {
  fileName: string;
  tables: { [tableName: string]: Record<string, any>[] };
  timestamp: number;
}

// In-memory store for extracted data (in production, use a database or file system)
const dataStore: Map<string, StoredData> = new Map();

// Cleanup old data after 1 hour
const EXPIRY_TIME = 60 * 60 * 1000; // 1 hour

export function generateSessionId(): string {
  return randomBytes(16).toString("hex");
}

export function storeExtractedData(
  sessionId: string,
  fileName: string,
  tables: { [tableName: string]: Record<string, any>[] }
): void {
  // Clean up old entries
  const now = Date.now();
  for (const [key, value] of dataStore.entries()) {
    if (now - value.timestamp > EXPIRY_TIME) {
      dataStore.delete(key);
    }
  }

  // Store new data
  dataStore.set(sessionId, {
    fileName,
    tables,
    timestamp: now,
  });
}

export function getExtractedData(sessionId: string): StoredData | null {
  const data = dataStore.get(sessionId);
  if (!data) return null;

  // Check if data has expired
  if (Date.now() - data.timestamp > EXPIRY_TIME) {
    dataStore.delete(sessionId);
    return null;
  }

  return data;
}

export function deleteExtractedData(sessionId: string): void {
  dataStore.delete(sessionId);
}
