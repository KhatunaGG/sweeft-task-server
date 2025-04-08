import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create.company.dto';
import { Types } from 'mongoose';
import { Prop } from '@nestjs/mongoose';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  
  validationToken?: string;
  isVerified?: boolean;
  validationLinkValidateDate?: Date;
  uploadedFiles?: (string | Types.ObjectId)[];


















  


  subscriptionPlan?: string;
  updatedCompanyDate?: Date;
  // premiumCharge?: number;
  // extraUserCharge?: number;



  @Prop({ default: Date.now })
  subscriptionUpdateDate?: Date;

  @Prop({default: 0})
  premiumCharge?: number;

  @Prop({default: 0})
  extraUserCharge?: number;

  @Prop({default: 0})
  extraFileCharge?: number
 
}
