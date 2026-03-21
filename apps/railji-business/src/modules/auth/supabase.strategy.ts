import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { config } from '../../config/config';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role?: string;
  aud: string;
  exp: number;
  iat: number;
}

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  private readonly logger = new Logger(SupabaseStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${config.supabase.url}/auth/v1/jwks`,
      }),
      audience: config.supabase.jwtAudience,
      issuer: `${config.supabase.url}/auth/v1`,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload) {
    try {
      if (!payload.sub || !payload.email) {
        this.logger.warn('Invalid token payload: missing sub or email');
        throw new UnauthorizedException('Invalid token payload');
      }

      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role || 'user',
      };
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
