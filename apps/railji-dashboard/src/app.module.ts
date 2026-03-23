import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  SharedCommonModule,
  LoggingInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  HttpExceptionFilter,
  AuthModule,
} from '@libs';
import { config } from './config/config';
import { PapersModule } from './modules/papers/papers.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    MongooseModule.forRoot(config.database.uri),
    SharedCommonModule,
    AuthModule.forRoot({
      url: config.supabase.url,
      jwtAudience: config.supabase.jwtAudience,
    }),
    PapersModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
export class AppModule {}
