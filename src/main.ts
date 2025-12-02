import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionLoggingFilter } from './auto-action/http-exception-logging.filter';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionLoggingFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           
      forbidNonWhitelisted: true, 
      transform: true,         
    }),
  );

  const port = process.env.PORT || 9000;
  await app.listen(port);
  console.log(`Auto Action Module listening on port ${port}`);
}
bootstrap();
