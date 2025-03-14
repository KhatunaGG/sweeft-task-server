import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Company {
  @Prop()
  name: string;

  @Prop({ unique: true })
  email: string;

  @Prop({select: false})
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

}

export const CompanySchema = SchemaFactory.createForClass(Company);
