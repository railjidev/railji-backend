import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IUserService } from '../utils/auth.utils';

export const ROLES_KEY = 'roles';
export const OWNERSHIP_KEY = 'ownership';

export interface OwnershipConfig {
  required: boolean;
  paramName?: string;
  bodyField?: string;
  checkType?: 'param' | 'body' | 'both';
}

/**
 * Interface for services that can verify resource ownership
 * Implement this in your service to enable ownership checks on specific resources
 */
export interface IOwnershipService {
  verifyOwnership(resourceId: string, userId: string): Promise<void>;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: IUserService,
    private ownershipService?: IOwnershipService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get role configuration from decorator
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const ownershipConfig = this.reflector.getAllAndOverride<OwnershipConfig>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or ownership required, allow access
    if (!roles && !ownershipConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const supabaseId = request.user?.userId;

    if (!supabaseId) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      // Fetch user from database
      const user = await this.usersService.findUserBySupabaseId(supabaseId);

      if (!user) {
        throw new UnauthorizedException('User not found in database');
      }

      // Check role-based access
      if (roles && roles.length > 0) {
        const userRole = (user as any).userType || (user as any).role;

        if (!userRole || !roles.includes(userRole)) {
          throw new ForbiddenException(
            `Access denied. Required role: ${roles.join(' or ')}`,
          );
        }
      }

      // Check ownership
      if (ownershipConfig?.required) {
        await this.checkOwnership(request, user.userId, ownershipConfig);
      }

      // Attach full user to request for use in controllers
      request.dbUser = user;

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Authorization failed');
    }
  }

  private async checkOwnership(
    request: any,
    userId: string,
    config: OwnershipConfig,
  ): Promise<void> {
    const checkType = config.checkType || 'param';

    // Check params
    if (checkType === 'param' || checkType === 'both') {
      const paramName = config.paramName || 'userId';
      const requestedUserId = request.params[paramName];

      if (requestedUserId && requestedUserId !== userId) {
        throw new ForbiddenException('You can only access your own data');
      }
    }

    // Check body field (e.g., examId) - verify ownership via service
    if (checkType === 'body' || checkType === 'both') {
      const bodyField = config.bodyField;
      const resourceId = request.body?.[bodyField];

      if (resourceId) {
        if (!this.ownershipService) {
          throw new Error(
            'OwnershipService not provided but body ownership check requested',
          );
        }

        // Delegate to service to verify ownership
        await this.ownershipService.verifyOwnership(resourceId, userId);
      }
    }
  }
}
