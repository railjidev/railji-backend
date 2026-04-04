import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SupabaseStrategy } from '../auth/supabase.strategy';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly supabaseStrategy: SupabaseStrategy,
    private readonly excludedRoutes: string[] = [],
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Check if route is in exclusion list
    const isExcluded = this.isRouteExcluded(req.baseUrl);

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (isExcluded) {
      // For excluded routes, optionally populate user if token is provided
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payload = this.decodeToken(token);
          const user = await this.supabaseStrategy.validate(payload);
          if (user) {
            (req as any).user = user;
          }
        } catch (error) {
          // Silently fail for excluded routes - don't block the request
        }
      }
      return next();
    }

    // For non-excluded routes, require authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Decode and validate token payload
      const payload = this.decodeToken(token);
      
      // Validate using SupabaseStrategy
      const user = await this.supabaseStrategy.validate(payload);
      
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Attach user to request object
      (req as any).user = user;
      
      next();
    } catch (error) {
      throw new UnauthorizedException(
        error.message || 'Authentication failed',
      );
    }
  }

  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token format');
    }
  }

  private isRouteExcluded(path: string): boolean {
    return this.excludedRoutes.some((excludedRoute) => {
      // Convert route pattern to regex (handle :param patterns)
      const pattern = excludedRoute.replace(/:[^\s/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path);
    });
  }
}
