import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { ExamsModule } from './modules/exams/exams.module';
import { PapersModule } from './modules/papers/papers.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { UsersModule } from './modules/users/users.module';
import {
  SharedCommonModule,
  LoggingInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  HttpExceptionFilter,
  LoggerServiceProvider,
} from '@libs';
import { config } from './config/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    MongooseModule.forRoot(config.database.uri),
    SharedCommonModule,
    AuthModule,
    ExamsModule,
    PapersModule,
    DepartmentsModule,
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
