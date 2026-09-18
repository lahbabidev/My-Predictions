import fs from "fs";
import path from "path";
import { StoredPredictionRecord } from "./predictionStorage";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "predictions_store.json");

// In-memory cache to guarantee sub-millisecond reads
let memoryStore: Map<string, StoredPredictionRecord> | null = null;

function ensureStoreLoaded(): Map<string, StoredPredictionRecord> {
  if (memoryStore !== null) {
    return memoryStore;
  }

  memoryStore = new Map();

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      if (raw && raw.trim()) {
        try {
          const records: StoredPredictionRecord[] = JSON.parse(raw);
          if (Array.isArray(records)) {
            for (const rec of records) {
              if (rec && rec.id) {
                memoryStore.set(rec.id, rec);
              }
            }
          }
        } catch (parseErr) {
          console.error("[ServerPredictionStore] Corrupted JSON in predictions_store.json:", parseErr);
        }
      }
    }
  } catch (err) {
    console.error("[ServerPredictionStore] Failed to read disk store, using in-memory only:", err);
  }

  return memoryStore;
}

function flushToDisk(): void {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(memoryStore.values());
    fs.writeFileSync(STORE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[ServerPredictionStore] Failed to flush to disk:", err);
  }
}

export function normalizePredictionId(date: string, reunion: string, course: string): string {
  const cleanDate = date.replace(/[^0-9]/g, "");
  const rNum = reunion.toUpperCase().replace("R", "");
  const cNum = course.toUpperCase().replace("C", "");
  return `prediction_${cleanDate}_R${rNum}_C${cNum}`;
}

export function getServerPredictions(): StoredPredictionRecord[] {
  const store = ensureStoreLoaded();
  const list = Array.from(store.values());
  // Sort descending by savedAt
  list.sort((a, b) => (b.savedAt || b.timestamp || 0) - (a.savedAt || a.timestamp || 0));
  return list;
}

export function getServerPredictionById(id: string): StoredPredictionRecord | null {
  const store = ensureStoreLoaded();
  return store.get(id) || null;
}

export function saveServerPrediction(record: StoredPredictionRecord): StoredPredictionRecord {
  const store = ensureStoreLoaded();
  
  // Ensure normalized ID
  const cleanId = normalizePredictionId(record.date, record.reunion, record.course);
  const normalizedRecord: StoredPredictionRecord = {
    ...record,
    id: cleanId,
    lastUpdated: Date.now(),
  };

  store.set(cleanId, normalizedRecord);
  flushToDisk();
  return normalizedRecord;
}

export function deleteServerPrediction(id: string): boolean {
  const store = ensureStoreLoaded();
  const deleted = store.delete(id);
  if (deleted) {
    flushToDisk();
  }
  return deleted;
}
