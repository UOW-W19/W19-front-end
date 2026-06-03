import { describe, expect, it } from 'vitest';
import {
  getDailyProgressStorageKey,
  loadDailyProgress,
  recordDailyProgressCompletion,
} from './dailyProgress';

class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

describe('daily progress storage', () => {
  const today = new Date(2026, 5, 3, 10, 30);
  const yesterday = new Date(2026, 5, 2, 10, 30);

  it('loads an empty count when nothing is stored for today', () => {
    const storage = new MemoryStorage();

    expect(loadDailyProgress('user-1', today, storage)).toEqual({
      date: '2026-06-03',
      count: 0,
      completionIds: [],
    });
  });

  it('records quick practice and lesson completions once each', () => {
    const storage = new MemoryStorage();

    const quickPractice = recordDailyProgressCompletion('user-1', 'practice:session-1', today, storage);
    const lesson = recordDailyProgressCompletion('user-1', 'lesson:bank-1:2026-06-03T00:00:00.000Z', today, storage);

    expect(quickPractice.added).toBe(true);
    expect(lesson.added).toBe(true);
    expect(loadDailyProgress('user-1', today, storage).count).toBe(2);
  });

  it('does not double count the same completion id', () => {
    const storage = new MemoryStorage();

    recordDailyProgressCompletion('user-1', 'practice:session-1', today, storage);
    const duplicate = recordDailyProgressCompletion('user-1', 'practice:session-1', today, storage);

    expect(duplicate.added).toBe(false);
    expect(loadDailyProgress('user-1', today, storage).count).toBe(1);
  });

  it('ignores stale records stored under the current key', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      getDailyProgressStorageKey('user-1', today),
      JSON.stringify({ date: '2026-06-02', count: 1, completionIds: ['practice:old'] })
    );

    expect(loadDailyProgress('user-1', today, storage).count).toBe(0);
    expect(loadDailyProgress('user-1', yesterday, storage).count).toBe(0);
  });
});
