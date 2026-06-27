/**
 * Tailwind className helper. Combines clsx + tailwind-merge to dedupe
 * conflicting utilities (e.g. "p-2 p-4" → "p-4").
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}