import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { timestamp } from 'rxjs';

@Schema({ timestamps: true })
export class File {


  @Prop({ type: String, required: true })  
  filePath: string;

  // @Prop({ type: String, required: true })  
  // fileName: string;

  @Prop({ type: String, required: true })  
  fileOwnerId: string;

  @Prop({ type: String, required: true })  
  fileOwnerCompanyId: string;

  // @Prop({ type: String })
  // userPermissions: [{ type: String }]


  @Prop({type: [String], default: []})
  userPermissions: string[]














  // @Prop({ type: String })
  // file: string;

  // @Prop()
  // fileName: string;

  // @Prop()
  // fileOwnerId: string;

  // @Prop()
  // fileOwnerCompanyId: string;
}
export const FileSchema = SchemaFactory.createForClass(File);
