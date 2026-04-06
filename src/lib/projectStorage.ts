import type { ProjectSettings } from "@/lib/projectTypes";

const PROJECTS_STORAGE_KEY = "ateliermojis-projects-v1";
const MAX_RECENT_PROJECTS = 5;

const DB_NAME = "ateliermojis";
const DB_VERSION = 1;
const BLOBS_STORE = "project-blobs";

export interface ProjectRecord {
  id: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
}

function getDefaultName(name: string): string {
  return `${name.replace(/\.[^.]+$/, "")}-emoji`;
}

function getDefaultSettings(fileName: string): ProjectSettings {
  return {
    downloadName: getDefaultName(fileName),
    squareMode: "pad",
    landscapeAlign: "center",
    step: "done",
  };
}

function readRecords(): ProjectRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeRecord(item))
      .filter((item): item is ProjectRecord => item !== null);
  } catch {
    return [];
  }
}

function normalizeRecord(value: unknown): ProjectRecord | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<ProjectRecord> & {
    settings?: Partial<ProjectSettings>;
  };

  if (typeof raw.id !== "string" || typeof raw.fileName !== "string") {
    return null;
  }

  const createdAt =
    typeof raw.createdAt === "string"
      ? raw.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt;

  const defaults = getDefaultSettings(raw.fileName);
  const rawSettings: Partial<ProjectSettings> = raw.settings ?? {};

  return {
    id: raw.id,
    fileName: raw.fileName,
    createdAt,
    updatedAt,
    settings: {
      downloadName:
        typeof rawSettings.downloadName === "string"
          ? rawSettings.downloadName
          : defaults.downloadName,
      squareMode:
        rawSettings.squareMode === "crop" || rawSettings.squareMode === "pad"
          ? rawSettings.squareMode
          : defaults.squareMode,
      landscapeAlign:
        rawSettings.landscapeAlign === "top" ||
        rawSettings.landscapeAlign === "center" ||
        rawSettings.landscapeAlign === "bottom"
          ? rawSettings.landscapeAlign
          : defaults.landscapeAlign,
      crop:
        rawSettings.crop &&
        rawSettings.crop.unit === "%" &&
        typeof rawSettings.crop.x === "number" &&
        typeof rawSettings.crop.y === "number" &&
        typeof rawSettings.crop.width === "number" &&
        typeof rawSettings.crop.height === "number"
          ? rawSettings.crop
          : undefined,
      step: rawSettings.step === "crop" ? "crop" : "done",
    },
  };
}

function writeRecords(records: ProjectRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(records));
}

function sortRecent(records: ProjectRecord[]): ProjectRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function mergeProjectSettings(
  current: ProjectSettings,
  next: Partial<ProjectSettings>,
): ProjectSettings {
  return {
    ...current,
    ...next,
    crop: next.crop ?? current.crop,
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  return openDb().then(async (db) => {
    try {
      const tx = db.transaction(BLOBS_STORE, mode);
      const store = tx.objectStore(BLOBS_STORE);
      const result = await runner(store);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx error"));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB tx abort"));
      });

      return result;
    } finally {
      db.close();
    }
  });
}

function requestToPromise<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed"));
    };
  });
}

async function putOriginalBlob(id: string, blob: Blob): Promise<void> {
  await withStore("readwrite", async (store) => {
    await requestToPromise(store.put({ id, originalBlob: blob }));
  });
}

async function getOriginalBlob(id: string): Promise<Blob | null> {
  return withStore("readonly", async (store) => {
    const result = await requestToPromise<
      { id: string; originalBlob?: Blob } | undefined
    >(store.get(id));
    return result?.originalBlob ?? null;
  });
}

async function deleteOriginalBlob(id: string): Promise<void> {
  await withStore("readwrite", async (store) => {
    await requestToPromise(store.delete(id));
  });
}

function upsertRecord(record: ProjectRecord): {
  records: ProjectRecord[];
  prunedIds: string[];
} {
  const current = readRecords().filter((item) => item.id !== record.id);
  const ordered = sortRecent([record, ...current]);
  const kept = ordered.slice(0, MAX_RECENT_PROJECTS);
  const keptIds = new Set(kept.map((item) => item.id));
  const prunedIds = ordered
    .filter((item) => !keptIds.has(item.id))
    .map((item) => item.id);

  writeRecords(kept);
  return { records: kept, prunedIds };
}

export async function createProjectFromFile(
  file: File,
): Promise<ProjectRecord> {
  const now = new Date().toISOString();
  const id = window.crypto.randomUUID();
  const record: ProjectRecord = {
    id,
    fileName: file.name,
    createdAt: now,
    updatedAt: now,
    settings: getDefaultSettings(file.name),
  };

  await putOriginalBlob(id, file);
  const { prunedIds } = upsertRecord(record);
  await Promise.all(prunedIds.map((prunedId) => deleteOriginalBlob(prunedId)));
  return record;
}

export async function updateProjectSettings(
  projectId: string,
  nextSettings: Partial<ProjectSettings>,
): Promise<ProjectRecord | null> {
  const current = readRecords();
  const existing = current.find((item) => item.id === projectId);
  if (!existing) return null;

  const updated: ProjectRecord = {
    ...existing,
    updatedAt: new Date().toISOString(),
    settings: mergeProjectSettings(existing.settings, nextSettings),
  };

  upsertRecord(updated);
  return updated;
}

export async function touchProject(projectId: string): Promise<void> {
  const current = readRecords();
  const existing = current.find((item) => item.id === projectId);
  if (!existing) return;

  const updated: ProjectRecord = {
    ...existing,
    updatedAt: new Date().toISOString(),
  };

  upsertRecord(updated);
}

export async function deleteProject(projectId: string): Promise<void> {
  const nextRecords = readRecords().filter((item) => item.id !== projectId);
  writeRecords(nextRecords);
  await deleteOriginalBlob(projectId);
}

export function listRecentProjectRecords(
  limit = MAX_RECENT_PROJECTS,
): ProjectRecord[] {
  return sortRecent(readRecords()).slice(0, limit);
}

export async function loadProject(
  projectId: string,
): Promise<{ record: ProjectRecord; file: File } | null> {
  const record = readRecords().find((item) => item.id === projectId);
  if (!record) return null;

  const originalBlob = await getOriginalBlob(projectId);
  if (!originalBlob) return null;

  const file = new File([originalBlob], record.fileName, {
    type: originalBlob.type || "image/png",
    lastModified: new Date(record.updatedAt).getTime(),
  });

  return { record, file };
}

export async function loadRecentProjectsWithBlob(
  limit = MAX_RECENT_PROJECTS,
): Promise<Array<{ record: ProjectRecord; blob: Blob }>> {
  const records = listRecentProjectRecords(limit);
  const entries = await Promise.all(
    records.map(async (record) => {
      const blob = await getOriginalBlob(record.id);
      if (!blob) return null;
      return { record, blob };
    }),
  );

  return entries.filter(
    (entry): entry is { record: ProjectRecord; blob: Blob } => {
      return entry !== null;
    },
  );
}
