import { describe, expect, it } from 'vitest';
import { categoriseWord } from './wordCategories';

describe('categoriseWord', () => {
  it('classifies apple as food instead of matching the app keyword', () => {
    expect(categoriseWord('りんご', 'apple')).toBe('food');
    expect(categoriseWord('apple', '')).toBe('food');
  });

  it('keeps exact app matches in electronics', () => {
    expect(categoriseWord('app', '')).toBe('electronics');
  });

  it('does not match app inside larger words', () => {
    expect(categoriseWord('application', '')).toBe('other');
    expect(categoriseWord('happy', '')).toBe('other');
    expect(categoriseWord('pineapple', '')).toBe('food');
  });

  it('still matches multi-word keywords', () => {
    expect(categoriseWord('hello', 'good morning')).toBe('greetings');
    expect(categoriseWord('', 'how much')).toBe('shopping');
  });
});
