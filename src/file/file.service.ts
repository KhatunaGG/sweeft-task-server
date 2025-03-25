import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { Type } from '@aws-sdk/client-s3';
import mongoose, { Model, Mongoose, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { CompanyService } from 'src/company/company.service';
import { Role } from 'src/enums/roles.enum';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    private aswS3Service: AwsS3Service,
    private companyService: CompanyService,
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
    fileOwnerCompanyId: Types.ObjectId | string,
    userPermissions: string[],
  ) {
    try {
      if (!fileOwnerCompanyId) {
        throw new UnauthorizedException('User ID or Company ID is required.');
      }
      const filePathFromAws = await this.aswS3Service.uploadFile(
        filePath,
        buffer,
      );
      if (!filePathFromAws) {
        throw new NotFoundException('Image ID not found');
      }
      const file = new this.fileModel({
        fileOwnerId,
        fileOwnerCompanyId,
        filePath: filePathFromAws,
        userPermissions,
      });
      const newFile = await this.fileModel.create(file);
      if (file) {
        const existingCompany =
          await this.companyService.getById(fileOwnerCompanyId);
        if (!existingCompany) throw new BadGatewayException();

        existingCompany.uploadedFiles.push(
          new mongoose.Types.ObjectId(file._id),
        );
        await existingCompany.save();
      }
      return filePathFromAws;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  //BEFORE permission
  // async findAll(userId: Types.ObjectId | string, companyId: Types.ObjectId | string, role: Role) {
  //   if (!userId || !companyId) {
  //     throw new UnauthorizedException();
  //   }
  //   try {
  //     if (role === "admin") {
  //       const files = await this.fileModel.find();
  //       if (files.length === 0) {
  //         return { message: "No files found for this company." };
  //       }
  //       return files;
  //     } else if (role === "user") {
  //       const files = await this.fileModel.find({
  //         // companyId,
  //         fileOwnerId: userId
  //       });
  //       if (files.length === 0) {
  //         return { message: "No files found for your account in this company." };
  //       }
  //       return files;
  //     } else {
  //       throw new UnauthorizedException("Invalid role provided.");
  //     }
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

  async findAll(
    userId: Types.ObjectId | string,
    companyId: Types.ObjectId | string,
    role: Role,
    customId: Types.ObjectId | string,
  ) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    let allFiles;
    try {
      if (customId === userId) {
        allFiles = await this.fileModel.find({ fileOwnerCompanyId: companyId });
        if (allFiles.length === 0) {
          return { message: 'No files found for this company.' };
        }
      } else {
        const files = await this.fileModel.find({
          fileOwnerCompanyId: companyId,
          fileOwnerId: userId,
        });

        if (files.length === 0) {
          return {
            message: 'No files found for your account in this company.',
          };
        }
        const permissionFiles = await this.fileModel.find({
          fileOwnerCompanyId: companyId,
          permission: { $in: [userId] },
        });

        allFiles = [...files, ...permissionFiles];
      }
      console.log('All Files to return:', allFiles);
      return allFiles;
    } catch (e) {
      console.log(e);
      throw new UnauthorizedException('Error fetching files');
    }
  }






  
  create(createFileDto: CreateFileDto) {
    return this.fileModel.create(createFileDto);
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
