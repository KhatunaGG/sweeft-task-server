import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsNotEmpty, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsNotEmpty()
  @IsString()
  firstName?: string;

  @IsNotEmpty()
  @IsString()
  lastName?: string;

  @IsNotEmpty()
  @IsString()
  userPassword?: string;
  
  companyId?: string;
  isVerified?: boolean;
  validationLink?: string;
  validationLinkValidateDate?: Date;
  uploadedFiles?: (string | Types.ObjectId)[];
}
