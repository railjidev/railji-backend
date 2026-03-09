export const APP_CONSTANTS = {
  // Application Info
  APP_NAME: 'Railji Business',
  APP_VERSION: '1.0.0',

  // API Configuration
  API_PREFIX: 'business/v1',
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  // Database
  DEFAULT_SORT_ORDER: 'desc',
  DEFAULT_SORT_FIELD: 'createdAt',

  // Exam Submission Status (User Attempt Progress)
  EXAM_STATUS: {
    IN_PROGRESS: 'in-progress',
    SUBMITTED: 'submitted',
    ABANDONED: 'abandoned',
    TIMEOUT: 'timeout',
  },

  // Exam Mode
  EXAM_MODE: {
    MOCK: 'mock',
    LIVE: 'live',
  },

  // Paper Related
  PAPER_STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
  },

  // Question Types
  QUESTION_TYPES: {
    MULTIPLE_CHOICE: 'multiple-choice',
    TRUE_FALSE: 'true-false',
    SHORT_ANSWER: 'short-answer',
    ESSAY: 'essay',
  },

  // Difficulty Levels
  DIFFICULTY_LEVELS: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
  },

  // Time Constants (in minutes)
  DEFAULT_EXAM_DURATION: 60,
  MIN_EXAM_DURATION: 15,
  MAX_EXAM_DURATION: 300,

  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,

  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
  },

  DEPARTMENTS: [
    'DEPT001',
    'DEPT002',
    'DEPT003',
    'DEPT004',
    'DEPT005',
    'DEPT006',
    'DEPT007',
  ],
} as const;

// Export individual constants for convenience
export const {
  API_PREFIX,
  EXAM_STATUS,
  EXAM_MODE,
  PAPER_STATUS,
  QUESTION_TYPES,
  DEPARTMENTS,
} = APP_CONSTANTS;
