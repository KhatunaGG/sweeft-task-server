import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FileSchema } from './schema/file.schema';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';
import { AuthGuard } from 'src/guard/auth.guard';
import { CompanyModule } from 'src/company/company.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
    AwsS3Module,
    UserModule,
    AuthModule,
    CompanyModule
  ],
  controllers: [FileController],
  providers: [FileService, AuthGuard],
})
export class FileModule {}
