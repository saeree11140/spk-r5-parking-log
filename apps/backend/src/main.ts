import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { requireAuthEnvironment } from './auth/auth-environment';
import { ApiExceptionFilter } from './common/api-exception.filter';

async function bootstrap(): Promise<void> {
  const authEnvironment = requireAuthEnvironment();
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.BACKEND_PORT) || 3001;

  if (authEnvironment.trustProxyHops > 0) {
    const httpInstance: unknown = app.getHttpAdapter().getInstance();
    (httpInstance as { set(name: string, value: unknown): void }).set(
      'trust proxy',
      authEnvironment.trustProxyHops,
    );
  }
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: [authEnvironment.frontendUrl],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.listen(port);
}

void bootstrap();
