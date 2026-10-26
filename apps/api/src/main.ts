import 'reflect-metadata';

import multipart from '@fastify/multipart';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: 16 * 1024 * 1024 }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  const prefix = config.get<string>('globalPrefix') ?? 'api';
  const corsOrigins = config.get<string[]>('corsOrigins') ?? ['http://localhost:5173'];
  const uploadDir = resolve(config.get<string>('upload.dir') ?? 'uploads');
  const maxUploadMb = Math.max(Number(config.get<number>('upload.maxFileSizeMb') ?? 12), 1);

  // 表情广场：本地文件上传 + 静态访问 /api/uploads/**
  mkdirSync(uploadDir, { recursive: true });
  await app.register(multipart, {
    limits: {
      fileSize: maxUploadMb * 1024 * 1024,
      files: 1,
      fields: 24,
      parts: 32,
    },
  });
  app.useStaticAssets({
    root: uploadDir,
    prefix: '/api/uploads/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    immutable: true,
    decorateReply: false,
  });
  // CORS_ORIGINS 含 '*' 时回显请求来源：前端与 /api 同源，宿主机 IP 变更无需改配置
  const allowAnyOrigin = corsOrigins.includes('*');

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: allowAnyOrigin ? true : corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.get<string>('env') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('洛天依 Wiki API')
      .setDescription(
        '虚拟歌手洛天依的资料库、歌曲管理与同好站点导航服务。所有响应统一包装为 { code, message, data }。',
      )
      .setVersion('0.1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
    });
  }

  await app.listen({ port, host: '0.0.0.0' });

  const logger = new Logger('Bootstrap');
  logger.log(`接口地址   http://localhost:${port}/${prefix}`);
  logger.log(`接口文档   http://localhost:${port}/${prefix}/docs`);
  logger.log(`允许来源   ${corsOrigins.join(', ')}`);
  logger.log(`上传目录   ${uploadDir}`);
}

void bootstrap();
