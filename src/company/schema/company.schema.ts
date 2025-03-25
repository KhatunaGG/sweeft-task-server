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
  subscriptionPlan: string;

  // @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'file', default: [] })
  // uploadedFiles: mongoose.Schema.Types.ObjectId[];

  // @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'user', default: [] })
  // user: mongoose.Schema.Types.ObjectId[];







  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId }],
    ref: 'file',
    default: [],
  })
  uploadedFiles: mongoose.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId }],
    ref: 'user',
    default: [],
  })
  user: mongoose.Types.ObjectId[];
}

export const CompanySchema = SchemaFactory.createForClass(Company);
