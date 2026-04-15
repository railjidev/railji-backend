import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerServiceProvider } from '@libs';
import { config } from './config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // Increase body size limit for large payloads
  app.use(require('express').json({ limit: '12mb' }));
  app.use(require('express').urlencoded({ limit: '12mb', extended: true }));

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

  // Enable CORS
  const isProduction = process.env.NODE_ENV === 'stage' || process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN;
  
  app.enableCors({
    origin: isProduction ? (corsOrigin ? corsOrigin.split(',').map(o => o.trim()) : true) : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 3600,
  });

  loggerService.log(
    isProduction 
      ? `CORS: Production mode (${corsOrigin || 'all origins'})` 
      : 'CORS: Development mode (all origins, no credentials)',
    'Bootstrap'
  );

  // Global prefix
  app.setGlobalPrefix('dashboard/v1');

  await app.listen(config.app.port, '0.0.0.0', () => {
    loggerService.log(
      `Railji Dashboard running on port ${config.app.port}`,
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
