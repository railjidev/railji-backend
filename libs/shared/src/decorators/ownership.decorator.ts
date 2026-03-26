import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_KEY = 'ownership';

export interface OwnershipConfig {
  required: boolean;
  paramName?: string; // Check in params (e.g., params.userId)
  bodyField?: string; // Check in body (e.g., body.examId)
  checkType?: 'param' | 'body' | 'both'; // What to check
}

/**
 * Decorator to require ownership check on a route
 * Ensures the authenticated user can only access their own data
 * 
 * @param paramOrBodyField - The parameter/field name to check
 * @param checkType - Where to check: 'param' (default), 'body', or 'both'
 * 
 * @example
 * @RequireOwnership('userId') // Checks params.userId
 * @RequireOwnership('examId', 'body') // Checks body.examId against exam owner
 * @RequireOwnership('userId', 'both') // Checks both params and body
 */
export const RequireOwnership = (
  paramOrBodyField: string = 'userId',
  checkType: 'param' | 'body' | 'both' = 'param',
) => {
  const config: OwnershipConfig = {
    required: true,
    checkType,
  };

  if (checkType === 'param' || checkType === 'both') {
    config.paramName = paramOrBodyField;
  }
  if (checkType === 'body' || checkType === 'both') {
    config.bodyField = paramOrBodyField;
  }

  return SetMetadata(OWNERSHIP_KEY, config);
};
