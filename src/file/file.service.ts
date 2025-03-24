import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { Type } from '@aws-sdk/client-s3';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    private aswS3Service: AwsS3Service,
  ) {}


//BEFOR userPermissions
  // async uploadFile(
  //   filePath: string,
  //   buffer: Buffer,
  //   fileOwnerId: Types.ObjectId | string,
  //   companyId: Types.ObjectId | string,
  // ) {
  //   try {
  //     if (!companyId) {
  //       throw new UnauthorizedException('User ID or Company ID is required.');
  //     }
  //     const filePathFromAws = await this.aswS3Service.uploadFile(
  //       filePath,
  //       buffer,
  //     );
  //     if (!filePathFromAws) {
  //       throw new NotFoundException('Image ID not found');
  //     }
  //     return filePathFromAws;
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }


  //ok
  async uploadFile(
    filePath: string,
    buffer: Buffer,
    fileOwnerId: Types.ObjectId | string,
    companyId: Types.ObjectId | string,
    userPermissions: string[], 
  ) {
    try {
      if (!companyId) {
        throw new UnauthorizedException('User ID or Company ID is required.');
      }
  

      const filePathFromAws = await this.aswS3Service.uploadFile(filePath, buffer);
      if (!filePathFromAws) {
        throw new NotFoundException('Image ID not found');
      }
  

      const file = new this.fileModel({
        fileOwnerId,
        fileOwnerCompanyId: companyId,
        filePath: filePathFromAws,
        userPermissions,
      });
      console.log(file, "file with permittions")
      await file.save();
  
      return filePathFromAws;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }


  create(createFileDto: CreateFileDto) {
    return 'This action adds a new file';
  }

  findAll() {
    return `This action returns all file`;
  }

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return `This action updates a #${id} file`;
  }

  remove(id: number) {
    return `This action removes a #${id} file`;
  }
}







// async getFile(fileId: string, userId: string) {
//   const file = await this.fileModel.findById(fileId);
//   if (!file) {
//     throw new NotFoundException('File not found');
//   }

//   // Check if the user has permission to access the file
//   if (file.companyId !== userId && !file.userPermissions.includes(userId)) {
//     throw new UnauthorizedException('You do not have permission to view this file');
//   }

//   return file;
// }