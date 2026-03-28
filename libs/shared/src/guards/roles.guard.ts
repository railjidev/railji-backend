import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SharedUsersService } from '../services/users.service';

export const ROLES_KEY = 'roles';
export const OWNERSHIP_KEY = 'ownership';

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
    private usersService: SharedUsersService,
    private ownershipService?: IOwnershipService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get role configuration from decorator
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const ownershipConfig = this.reflector.getAllAndOverride<{
      field: string;
      location: 'param' | 'body';
    }>(OWNERSHIP_KEY, [context.getHandler(), context.getClass()]);

    // If no roles or ownership required, allow access
    if (!roles && !ownershipConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    try {
      // Get user from request using the streamlined method
      const user = await this.usersService.getUserFromRequest(request);

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
      if (ownershipConfig) {
        await this.checkOwnership(request, user.userId, ownershipConfig);
      }

      // Attach full user to request for use in controllers
      request.dbUser = user;

      return true;
    } catch (error) {
      // Re-throw HTTP exceptions to preserve their status and message
      if (typeof error?.getStatus === 'function') {
        throw error;
      }
      throw new UnauthorizedException('Authorization failed');
    }
  }

  private async checkOwnership(
    request: any,
    userId: string,
    config: { field: string; location: 'param' | 'body' },
  ): Promise<void> {
    const resourceId =
      config.location === 'param'
        ? request.params[config.field]
        : request.body?.[config.field];

    if (!resourceId) {
      return; // No resource to check
    }

    // If checking userId directly, just compare
    if (config.field === 'userId') {
      if (resourceId !== userId) {
        throw new ForbiddenException('You can only access your own data');
      }
      return;
    }

    // For other resources (examId, paperId, etc.), verify via service
    if (!this.ownershipService) {
      throw new Error(
        `Ownership check for '${config.field}' requires an OwnershipService`,
      );
    }

    await this.ownershipService.verifyOwnership(resourceId, userId);
  }
}
