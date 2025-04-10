import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompanyModule } from './company/company.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailSenderModule } from './email-sender/email-sender.module';
import { UserModule } from './user/user.module';
import { FileModule } from './file/file.module';
import { AwsS3Module } from './aws-s3/aws-s3.module';
import { AuthGuard } from './guard/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI),
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: 465,
        auth: {
          user: process.env.EMAIL_NAME,
          pass: process.env.EMAIL_PASS,
        },
      },
    }),
    CompanyModule,
    AuthModule,
    EmailSenderModule,
    UserModule,
    FileModule,
    AwsS3Module,
  ],
  controllers: [AppController],
  providers: [AppService, AuthGuard],
})
export class AppModule {}
