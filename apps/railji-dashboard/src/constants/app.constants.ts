export const APP_CONSTANTS = {
  // Application Info
  APP_NAME: 'Railji Dashboard',
  APP_VERSION: '1.0.0',

  // API Configuration
  API_PREFIX: 'dashboard/v1',
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  // Authentication Exclusions (routes that don't require JWT authentication)
  AUTH_EXCLUDED_ROUTES: [
    '/dashboard/v1/health',
    '/dashboard/v1/users/login',
  ],
} as const;

// Export individual constants for convenience
export const {
  API_PREFIX,
  AUTH_EXCLUDED_ROUTES,
} = APP_CONSTANTS;
