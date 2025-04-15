import { PartialType } from '@nestjs/mapped-types';
import { CreateFileDto } from './create-file.dto';
import { IsArray, IsOptional } from 'class-validator';

export class UpdateFileDto extends PartialType(CreateFileDto) {
  @IsOptional()
  @IsArray()
  userPermissions?: string[];
}
