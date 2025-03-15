import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create.company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  validationToken?: string;
  isVerified?: boolean;
  validationLinkValidateDate?: Date;
}
