import { Module, DynamicModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseStrategy, SupabaseConfig } from './supabase.strategy';
import { createAuthModuleProviders } from './auth.factory';

@Module({})
export class AuthModule {
  static forRoot(config: SupabaseConfig): DynamicModule {
    return {
      module: AuthModule,
      imports: [PassportModule.register({ defaultStrategy: 'supabase' })],
      providers: [
        ...createAuthModuleProviders(config),
      ],
      exports: [PassportModule, SupabaseStrategy],
    };
  }
}
