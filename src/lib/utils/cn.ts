import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names with Tailwind CSS conflict resolution.
 * Use this everywhere instead of template literals for className.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
