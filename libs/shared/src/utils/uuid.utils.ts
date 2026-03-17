import { customAlphabet, nanoid } from 'nanoid';

/**
 * Default alphabet for generating IDs (alphanumeric)
 */
const DEFAULT_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * URL-safe alphabet (no ambiguous characters)
 */
const URL_SAFE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';

/**
 * Generate a standard nanoid (21 characters, URL-safe)
 */
export const generateId = (): string => {
  return nanoid();
};

/**
 * Generate a custom ID with specified length
 */
export const generateCustomId = (length: number = 6): string => {
  const generator = customAlphabet(DEFAULT_ALPHABET, length);
  return generator();
};

/**
 * Generate a URL-safe ID with specified length
 */
export const generateUrlSafeId = (length: number = 6): string => {
  const generator = customAlphabet(URL_SAFE_ALPHABET, length);
  return generator();
};

/**
 * Generate a paper ID with 'paper-' prefix
 */
export const generatePaperId = (): string => {
  return `paper-${generateCustomId(6)}`;
};

/**
 * Generate a user ID with 'user-' prefix
 */
export const generateUserId = (): string => {
  return `user-${generateCustomId(8)}`;
};

/**
 * Generate an exam ID with 'exam-' prefix
 */
export const generateExamId = (): string => {
  return `exam-${generateCustomId(6)}`;
};

/**
 * Generate a department ID with 'dept-' prefix
 */
export const generateDepartmentId = (): string => {
  return `dept-${generateCustomId(4)}`;
};

/**
 * Generate a custom prefixed ID
 */
export const generatePrefixedId = (prefix: string, length: number = 6): string => {
  return `${prefix}-${generateCustomId(length)}`;
};