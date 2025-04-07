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

  @Prop({ type: String, required: true })
  fileExtension: string;

  // @Prop({ type: String, required: true })
  contentType: { type: String; default: 'application/octet-stream' };
}
export const FileSchema = SchemaFactory.createForClass(File);
