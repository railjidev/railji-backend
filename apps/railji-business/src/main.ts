import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerServiceProvider } from '@libs';
import { config } from './config/config';
import { API_PREFIX } from './constants/app.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
  });

  // Setup Logger
  const loggerService = app.get(LoggerServiceProvider);
  app.useLogger(loggerService);

  // Setup Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS (optional)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(API_PREFIX);

  await app.listen(config.app.port, () => {
    loggerService.log(
      `Railji Business running on http://localhost:${config.app.port}`,
      'Bootstrap',
    );
    loggerService.log(
      `Configuration: ${JSON.stringify(config, null, 2)}`,
      'Bootstrap',
    );
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
