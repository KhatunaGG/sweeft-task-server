// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Types } from 'mongoose';
// import { timestamp } from 'rxjs';

// @Schema({ timestamps: true })
// export class File {
//   @Prop({ type: String, required: true })
//   filePath: string;

//   @Prop({ type: String, required: true })
//   fileName: string;

//   @Prop({ type: String, required: true })
//   fileOwnerId: string;

//   @Prop({ type: String, required: true })
//   fileOwnerCompanyId: string;

//   // @Prop({ type: String })
//   // userPermissions: [{ type: String }]

//   // @Prop({type: [String], default: []})
//   // userPermissions: string[]

//   @Prop({ type: [String], default: [] })
//   userPermissions: [
//     {
//       permissionById: { type: Types.ObjectId; required: true };
//       permissionByEmail: { type: String; required: true };
//     },
//   ];
// }
// export const FileSchema = SchemaFactory.createForClass(File);



import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

interface UserPermission {
  permissionById: Types.ObjectId;
  permissionByEmail: string;
}

@Schema({ timestamps: true })
export class File {
  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, required: true })
  fileOwnerId: string;

  @Prop({ type: String, required: true })
  fileOwnerCompanyId: string;

  @Prop({ type: [Object], default: [] })
  userPermissions: UserPermission[];
}
export const FileSchema = SchemaFactory.createForClass(File);
