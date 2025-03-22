// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// @Schema({ timestamps: true })
// export class User {
//   @Prop()
//   firstName: string;

//   @Prop()
//   lastName: string;

//   @Prop()
//   email: string;

//   @Prop()
//   userPassword: string;

//   @Prop()
//   companyId: string;

//   @Prop({ type: Boolean, default: false })
//   isVerified: boolean;

//   @Prop({ type: String })
//   validationLink: string;

//   @Prop({ type: Date })
//   validationLinkValidateDate: Date;
// }

// export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from 'src/enums/roles.enum';

@Schema({ timestamps: true })
export class User {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  userEmail: string;

  @Prop({select: false})
  userPassword: string;

  @Prop()
  companyId: string;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;

  @Prop({ type: String })
  validationLink: string;

  @Prop({ type: Date })
  validationLinkValidateDate: Date;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
