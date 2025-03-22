// import { Transform } from 'class-transformer';
// import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// export class CreateUserDto {
//   @IsNotEmpty()
//   @IsString()
//   firstName: string;

//   @IsNotEmpty()
//   @IsString()
//   lastName: string;

//   @IsEmail()
//   @IsNotEmpty()
//   @Transform(({ value }) => value.toLowerCase())
//   email: string;

//   @IsNotEmpty()
//   @IsString()
//   userPassword: string;


//   companyId: string;
//   isVerified?: boolean;
//   validationLink?: string;
//   validationLinkValidateDate?: Date;
// }



import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  // @IsNotEmpty()
  // @IsString()
  // firstName: string;

  // @IsNotEmpty()
  // @IsString()
  // lastName: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  userEmail: string;

  // @IsNotEmpty()
  // @IsString()
  // userPassword: string;


  // companyId: string;
  // isVerified?: boolean;
  // validationLink?: string;
  // validationLinkValidateDate?: Date;
}
