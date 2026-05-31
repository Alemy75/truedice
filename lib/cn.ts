import { clsx, type ClassValue } from "clsx";

/**
 * Tiny class-name helper. Replaced tailwind-merge with plain clsx after
 * dropping Tailwind — all class names in the app are now from our own
 * design CSS, so there are no conflicting Tailwind utilities to merge.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
