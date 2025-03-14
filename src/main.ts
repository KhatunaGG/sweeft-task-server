import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';


class CustomLogger extends Logger {
  log(message: string) {
    super.log(message);  // You can customize this to log to files, etc.
  }

  error(message: string, trace: string) {
    super.error(message, trace);  // Customize for error logging
  }
}



async function bootstrap() {

  // const app = await NestFactory.create(AppModule);

  
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'], // Enable log, warn, and error logging
  });



  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.listen(3003);
}
bootstrap();
