import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('supabase') {
  canActivate(context: ExecutionContext) {
    // Always return true to allow the request through
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Don't throw an error if authentication fails
    // Just return the user if available, or null if not
    return user || null;
  }
}