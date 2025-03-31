import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create.company.dto';
import { Types } from 'mongoose';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  validationToken?: string;
  isVerified?: boolean;
  validationLinkValidateDate?: Date;









  
  uploadedFiles?: (string | Types.ObjectId)[];
 
}
