import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

/**
 * Bootstrap function initializes the NestJS server.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // Cookie parsing with optional secret
  const cookieSecret = process.env.COOKIE_SECRET || 'mess_cookie_secret_key_32_characters';
  app.use(cookieParser(cookieSecret));

  // CORS configuration
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mess-id']
  });

  // Global API route prefix
  app.setGlobalPrefix('api/v1');

  // Strict Validation and Payload Whitelisting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  );

  // OpenAPI Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Mess Meal Manager API')
    .setDescription('Backend REST API for shared mess meal accounting in Bangladesh')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(
    `Mess Meal Manager API running on port ${port} (Timezone: ${process.env.APP_TIMEZONE || 'Asia/Dhaka'})`
  );
}

bootstrap();
