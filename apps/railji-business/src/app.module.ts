import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule, SupabaseStrategy } from '@libs';
import { ExamsModule } from './modules/exams/exams.module';
import { PapersModule } from './modules/papers/papers.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { UsersModule } from './modules/users/users.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import {
  SharedCommonModule,
  LoggingInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  RolesGuard,
  JwtAuthMiddleware,
} from '@libs';
import { config } from './config/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
    ExamsModule,
    PapersModule,
    DepartmentsModule,
    SubscriptionsModule,
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
      provide: APP_FILTER,
      useClass: ErrorInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: any) => {
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
