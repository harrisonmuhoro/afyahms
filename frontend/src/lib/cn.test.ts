import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('drops falsy values', () => {
    expect(cn('p-2', false, undefined, null, 'p-4')).toBe('p-4');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });
});