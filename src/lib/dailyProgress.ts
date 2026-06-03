const DAILY_PROGRESS_STORAGE_PREFIX = 'locale:learn:daily-progress';

export interface DailyProgressRecord {
  date: string;
  count: number;
  completionIds: string[];
}

export interface DailyProgressUpdate {
  record: DailyProgressRecord;
  added: boolean;
}

type DailyProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;

function getStorage(): DailyProgressStorage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getDailyProgressDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyProgressStorageKey(userId: string | null | undefined, date = new Date()): string {
  return `${DAILY_PROGRESS_STORAGE_PREFIX}:${userId || 'anonymous'}:${getDailyProgressDate(date)}`;
}

export function createEmptyDailyProgressRecord(date = new Date()): DailyProgressRecord {
  return {
    date: getDailyProgressDate(date),
    count: 0,
    completionIds: [],
  };
}

export function loadDailyProgress(
  userId: string | null | undefined,
  date = new Date(),
  storage: DailyProgressStorage | null = getStorage()
): DailyProgressRecord {
  const emptyRecord = createEmptyDailyProgressRecord(date);
  if (!storage) return emptyRecord;

  try {
    const rawRecord = storage.getItem(getDailyProgressStorageKey(userId, date));
    if (!rawRecord) return emptyRecord;

    const parsed = JSON.parse(rawRecord) as Partial<DailyProgressRecord>;
    if (parsed.date !== emptyRecord.date || !Array.isArray(parsed.completionIds)) {
      return emptyRecord;
    }

    const completionIds = [...new Set(parsed.completionIds.filter(id => typeof id === 'string'))];
    return {
      date: emptyRecord.date,
      count: completionIds.length,
      completionIds,
    };
  } catch {
    return emptyRecord;
  }
}

export function recordDailyProgressCompletion(
  userId: string | null | undefined,
  completionId: string,
  date = new Date(),
  storage: DailyProgressStorage | null = getStorage()
): DailyProgressUpdate {
  const currentRecord = loadDailyProgress(userId, date, storage);
  if (currentRecord.completionIds.includes(completionId)) {
    return { record: currentRecord, added: false };
  }

  const record = {
    date: currentRecord.date,
    completionIds: [...currentRecord.completionIds, completionId],
    count: currentRecord.completionIds.length + 1,
  };

  try {
    storage?.setItem(getDailyProgressStorageKey(userId, date), JSON.stringify(record));
  } catch {
    return { record: currentRecord, added: false };
  }

  return { record, added: true };
}
