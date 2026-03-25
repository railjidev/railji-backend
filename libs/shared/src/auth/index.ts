export { AuthModule } from './auth.module';
export { SupabaseStrategy, JwtPayload, SupabaseConfig } from './supabase.strategy';
export { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';
export { createSupabaseStrategyProvider, createAuthModuleProviders } from './auth.factory';