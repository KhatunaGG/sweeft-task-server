import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create.company.dto';
import { Types } from 'mongoose';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @IsString()
  @IsOptional()
  validationToken?: string;

  @IsArray()
  @IsOptional()
  @Type(() => String)
  isVerified?: boolean;

  @IsDate()
  @IsOptional()
  validationLinkValidateDate?: Date;

  @IsArray()
  @IsOptional()
  @Type(() => String)
  uploadedFiles?: Types.ObjectId[];

  @IsString()
  @IsOptional()
  subscriptionPlan?: string;

  @IsDate()
  @IsOptional()
  updatedCompanyDate?: Date;

  @IsDate()
  @IsOptional()
  subscriptionUpdateDate?: Date;

  @IsNumber()
  @IsOptional()
  premiumCharge?: number;

  @IsNumber()
  @IsOptional()
  extraUserCharge?: number;

  @IsNumber()
  @IsOptional()
  extraFileCharge?: number;

  @IsBoolean()
  @IsOptional()
  subscriptionFirstUpgrade?: boolean;

  @IsNumber()
  @IsOptional()
  linkResendCount?: number;

  @IsDate()
  @IsOptional()
  firstResendAttemptDate?: Date;
}
