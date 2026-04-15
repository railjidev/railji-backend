import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  SharedCommonModule,
  LoggingInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  HttpExceptionFilter,
  AuthModule,
  RolesGuard,
  JwtAuthMiddleware,
  SupabaseStrategy,
} from '@libs';
import { config } from './config/config';
import { PapersModule } from './modules/papers/papers.module';
import { UsersModule } from './modules/users/users.module';
import { Reflector } from '@nestjs/core';
import { UsersService } from './modules/users/users.service';
import { AUTH_EXCLUDED_ROUTES } from './constants/app.constants';

@Module({
  imports: [
    MongooseModule.forRoot(config.database.uri),
    SharedCommonModule,
    AuthModule.forRoot({
      url: config.supabase.url,
      jwtAudience: config.supabase.jwtAudience,
    }),
    UsersModule,
    PapersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, usersService: UsersService) => {
        return new RolesGuard(reflector, usersService);
      },
      inject: [Reflector, UsersService],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: any) => {
        // Allow OPTIONS requests (CORS preflight) to pass through without authentication
        if (req.method === 'OPTIONS') {
          return next();
        }
        const supabaseStrategy = this.getSupabaseStrategy();
        const middleware = new JwtAuthMiddleware(supabaseStrategy, AUTH_EXCLUDED_ROUTES);
        return middleware.use(req, res, next);
      })
      .forRoutes('*');
  }

  private getSupabaseStrategy(): SupabaseStrategy {
    return new SupabaseStrategy({
      url: config.supabase.url,
      jwtAudience: config.supabase.jwtAudience,
    });
  }
}
