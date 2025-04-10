import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Role } from 'src/enums/roles.enum';
import { Subscription } from 'src/enums/subscription.enum';

@Schema({ timestamps: true })
export class Company {
  @Prop()
  name: string;

  @Prop({ unique: true })
  email: string;

  @Prop({ select: false })
  password: string;

  @Prop()
  country: string;

  @Prop()
  industry: string;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;

  @Prop({ type: String })
  validationLink: string;

  @Prop({ type: Date })
  validationLinkValidateDate: Date;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: string;

  @Prop({ type: String, enum: Subscription, default: Subscription.FREE })
  // @Prop({ type: String, enum: Subscription, default: null })
  subscriptionPlan: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId }],
    ref: 'File',
    default: [],
  })
  uploadedFiles: mongoose.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId }],
    ref: 'user',
    default: [],
  })
  user: mongoose.Types.ObjectId[];


 @Prop({ default: null })
  subscriptionUpdateDate: Date;

  @Prop({ default: 0 })
  premiumCharge: number;

  @Prop({ default: 0 })
  extraUserCharge: number;
  
  @Prop({ default: 0 })
  extraFileCharge: number;





  @Prop({ type: Boolean, default: false })
// hasChangedFromDefaultPlan: boolean;
subscriptionFirstUpgrade: boolean





@Prop()
createdAt: Date; // Add createdAt here
updatedAt: Date;

}

export const CompanySchema = SchemaFactory.createForClass(Company);
