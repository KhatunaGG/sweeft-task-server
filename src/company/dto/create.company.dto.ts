import { Transform } from 'class-transformer';
import { IsBoolean, IsDate,  IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({value}) => value.toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  industry: string;










  


  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsString()
  @IsOptional()
  validationLink?: string;


  @IsDate()
  @IsOptional()
  validationLinkValidateDate?: Date;
















  

  @IsDate()
  @IsOptional()
  subscriptionUpdateDate?: Date;
}
