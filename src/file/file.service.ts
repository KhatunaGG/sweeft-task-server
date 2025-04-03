import {
  BadGatewayException,
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import mongoose, { Model, Mongoose, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { CompanyService } from 'src/company/company.service';
import { Role } from 'src/enums/roles.enum';
import { File } from './schema/file.schema';
import { Type } from '@aws-sdk/client-s3';
import { UpdateCompanyDto } from 'src/company/dto/update.company.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    // private userService: UserService,
    private aswS3Service: AwsS3Service,
    private companyService: CompanyService,
  ) {}

  async uploadFile(
    filePath: string,
    buffer: Buffer,
    fileOwnerId: Types.ObjectId | string,
    fileOwnerCompanyId: Types.ObjectId | string,
    userPermissions: string[],
    fileName: string,
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
        fileName,
      });
      const newFile = await this.fileModel.create(file);
      if (newFile) {
        const existingCompany =
          await this.companyService.getById(fileOwnerCompanyId);
        if (!existingCompany) return;

        existingCompany.uploadedFiles.push(
          new mongoose.Types.ObjectId(file._id),
        );
        await existingCompany.save();
        const existingUser = await this.userService.getById(fileOwnerId);
        if (!existingUser) return;
        existingUser.uploadedFiles.push(new mongoose.Types.ObjectId(file._id));
        await existingUser.save();
      }
      return {
        uploadedFile: newFile,
        filePathFromAws,
      };

      // return filePathFromAws;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }




   //before permissions delete
  // async findAll(
  //   userId: Types.ObjectId | string,
  //   companyId: Types.ObjectId | string,
  //   // customId: Types.ObjectId | string,
  // ) {
  //   if (!userId || !companyId) {
  //     throw new UnauthorizedException();
  //   }
  //   let allFiles;
  //   try {
  //     if (companyId.toString() === userId.toString()) {
  //       allFiles = await this.fileModel
  //         .find({ fileOwnerCompanyId: companyId })
  //         .exec();

  //       if (allFiles.length === 0) {
  //         return { message: 'No files found for this company.' };
  //       }
  //     } else {
  //       const files = await this.fileModel
  //         .find({ fileOwnerCompanyId: companyId })
  //         .exec();
  //       const parsedFiles = files.map((file) => ({
  //         ...file.toObject(),
  //         parsedPermissions:
  //           file.userPermissions.length > 0
  //             ? file.userPermissions.flatMap((permission) => {
  //                 try {
  //                   const parsed =
  //                     typeof permission === 'string'
  //                       ? JSON.parse(permission)
  //                       : permission;
  //                   return Array.isArray(parsed) ? parsed : [parsed];
  //                 } catch (error) {
  //                   console.error('Error parsing permission:', error);
  //                   return [];
  //                 }
  //               })
  //             : [],
  //       }));

  //       const filesForAll = parsedFiles.filter(
  //         (file) => file.parsedPermissions.length === 0,
  //       );
  //       const filesForUsers = parsedFiles.filter((file) =>
  //         file.parsedPermissions.some(
  //           (permission) => permission.permissionById === userId.toString(),
  //         ),
  //       );
  //       const uniqueFiles = new Map();
  //       [...filesForAll, ...filesForUsers].forEach((file) => {
  //         uniqueFiles.set(file._id.toString(), file);
  //       });
  //       allFiles = Array.from(uniqueFiles.values());
  //     }

  //     return allFiles;
  //   } catch (e) {
  //     console.log(e);
  //     throw new UnauthorizedException('Error fetching files');
  //   }
  // }


  async findAll(
    userId: Types.ObjectId | string,
    companyId: Types.ObjectId | string
  ) {
    if (!userId || !companyId) {
      throw new UnauthorizedException();
    }
  
    let allFiles;
    try {
      if (companyId.toString() === userId.toString()) {
        // Fetch all files for the company if the user is the same as the company
        allFiles = await this.fileModel.find({ fileOwnerCompanyId: companyId }).exec();
  
        if (allFiles.length === 0) {
          return { message: 'No files found for this company.' };
        }
      } else {
        const files = await this.fileModel.find({ fileOwnerCompanyId: companyId }).exec();
        const parsedFiles = files.map((file) => ({
          ...file.toObject(),
          parsedPermissions: file.userPermissions.length > 0
            ? file.userPermissions.map(permission => {
                try {
                  return typeof permission === 'string' ? JSON.parse(permission) : permission;
                } catch (error) {
                  console.error('Error parsing permission:', error);
                  return [];
                }
              }).flat()
            : [],
        }));
  
        const filesForAll = parsedFiles.filter(file => file.parsedPermissions.length === 0);
        const filesForUsers = parsedFiles.filter(file => file.parsedPermissions.some(
          permission => permission.permissionById === userId.toString()
        ));
  
        const uniqueFiles = new Map();
        [...filesForAll, ...filesForUsers].forEach((file) => {
          uniqueFiles.set(file._id.toString(), file);
        });
  
        allFiles = Array.from(uniqueFiles.values());
      }
      // console.log(allFiles, "allFiles from FILE Fileservice findAll")
  
      return allFiles;
    } catch (e) {
      console.log(e);
      throw new UnauthorizedException('Error fetching files');
    }
  }
  














  async updateUserPermissions(
    companyId: Types.ObjectId | string,
    fileId: Types.ObjectId | string,
    userPermissions: [String],
  ) {
    try {
      if (!companyId) {
        throw new UnauthorizedException();
      }
      if (!fileId) {
        throw new BadGatewayException('File ID is required');
      }
      const existingFile = await this.fileModel.findById(fileId);
      if (!existingFile) {
        throw new NotFoundException('File not found');
      }
    } catch (e) {
      console.log(e);
    }
  }

  async remove(companyId: string, userId: string, id: Types.ObjectId) {
    try {
      if (!companyId || !userId) throw new UnauthorizedException();
      if (!id) throw new BadGatewayException('File ID is required');

      const deletedFile = await this.fileModel.findByIdAndDelete(id);
      if (!deletedFile) throw new NotFoundException('File not found');

      const company = await this.companyService.findById(companyId);
      if (!company) throw new NotFoundException('Company not found');
      const index = company.uploadedFiles.indexOf(id);
      if (index === -1) {
        throw new NotFoundException(
          'File ID not found in company uploaded files',
        );
      }
      company.uploadedFiles.splice(index, 1);

      const user = await this.userService.getById(userId);
      if (!user) {
        return;
      }
      const usersFileIndex = company.uploadedFiles.indexOf(id);
      if (index === -1) {
        throw new NotFoundException(
          'File ID not found in company uploaded files',
        );
      }
      user.uploadedFiles.splice(usersFileIndex, 1);

      await company.save();
      await user.save();
      return 'File successfully removed from Company and Users';
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  create(createFileDto: CreateFileDto) {
    return this.fileModel.create(createFileDto);
  }

  findOne(id: string) {
    return `This action returns a #${id} file`;
  }

  //before company uploadedFiles and user uploadedFiles update
  // async update(
  //   userId: Types.ObjectId | string,
  //   companyId: Types.ObjectId | string,
  //   updateFileDto: UpdateFileDto,
  //   fileId: Types.ObjectId | string,
  // ) {
  //   console.log(updateFileDto, "updateFileDto")
  //   console.log(fileId, "fileId")
  //   console.log(companyId, "companyId")
  //   try {
  //     if (!companyId || !userId) throw new UnauthorizedException();
  //     if (!updateFileDto || !fileId) {
  //       throw new BadRequestException('No file or update data found.');
  //     }
  //     let parsedPermissions;
  //     if (typeof updateFileDto.userPermissions === 'string') {
  //       try {
  //         parsedPermissions = JSON.parse(updateFileDto.userPermissions);
  //       } catch (error) {
  //         throw new BadRequestException('Invalid userPermissions format. Expected valid JSON string.');
  //       }
  //     } else {
  //       parsedPermissions = updateFileDto.userPermissions;
  //     }
  //     if (!Array.isArray(parsedPermissions)) {
  //       throw new BadRequestException('userPermissions must be an array.');
  //     }
  //     const updatedFile = await this.fileModel.findByIdAndUpdate(
  //       fileId,
  //       // { userPermissions: parsedPermissions },
  //       { userPermissions: JSON.stringify(parsedPermissions.length > 0 ? parsedPermissions : []) },
  //       { new: true }
  //     );

  //     if (!updatedFile) {
  //       throw new NotFoundException(`File with ID ${fileId} not found.`);
  //     }

  //     const updateInCompany = await this.companyService.findById(companyId);
  //     if (!updateInCompany) {
  //       throw new NotFoundException('Company not found');
  //     }
  //     const companyUpdateDto: UpdateCompanyDto = {
  //       uploadedFiles: [...updateInCompany.uploadedFiles, fileId],
  //     };
  //     await this.companyService.update(updateInCompany._id, companyUpdateDto);

  //     const updateInUser = await this.userService.getById(userId);
  //     if (!updateInUser) return
  //     const userUpdateDto: UpdateUserDto = {
  //       uploadedFiles: [...updateInUser.uploadedFiles, fileId],
  //     };
  //     await this.userService.update(updateInUser._id, userUpdateDto);

  //     return updatedFile;
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

  async update(
    userId: Types.ObjectId | string,
    companyId: Types.ObjectId | string,
    updateFileDto: UpdateFileDto,
    fileId: Types.ObjectId | string,
  ) {
      try {
      if (!companyId || !userId) throw new UnauthorizedException();
      if (!updateFileDto || !fileId) {
        throw new BadRequestException('No file or update data found.');
      }
      let parsedPermissions;
      if (typeof updateFileDto.userPermissions === 'string') {
        try {
          parsedPermissions = JSON.parse(updateFileDto.userPermissions);
        } catch (error) {
          throw new BadRequestException(
            'Invalid userPermissions format. Expected valid JSON string.',
          );
        }
      } else {
        parsedPermissions = updateFileDto.userPermissions;
      }
      if (!Array.isArray(parsedPermissions)) {
        throw new BadRequestException('userPermissions must be an array.');
      }
      const updatedFile = await this.fileModel.findByIdAndUpdate(
        fileId,
        // { userPermissions: parsedPermissions },
        {
          userPermissions: JSON.stringify(
            parsedPermissions.length > 0 ? parsedPermissions : [],
          ),
        },
        { new: true },
      );

      if (!updatedFile) {
        throw new NotFoundException(`File with ID ${fileId} not found.`);
      }

      const updateInCompany = await this.companyService.findById(companyId);
      if (!updateInCompany) {
        throw new NotFoundException('Company not found');
      }

      const updatedCompanyUploadedFiles = updateInCompany.uploadedFiles.map(
        (file) =>
          file.toString() === fileId.toString() ? updatedFile._id : file,
      );

      const companyUpdateDto: UpdateCompanyDto = {
        uploadedFiles: updatedCompanyUploadedFiles,
      };

      console.log(updatedCompanyUploadedFiles, "updatedCompanyUploadedFiles")

      // const companyUpdateDto: UpdateCompanyDto = {
      //   uploadedFiles: [...updateInCompany.uploadedFiles, fileId],
      // };
      await this.companyService.update(updateInCompany._id, companyUpdateDto);

      const updateInUser = await this.userService.getById(userId);
      if (!updateInUser) return;
      const updatedUserUploadedFiles = updateInUser.uploadedFiles.map((file) =>
        file.toString() === fileId.toString() ? updatedFile._id : file,
      );

      const userUpdateDto: UpdateUserDto = {
        uploadedFiles: updatedUserUploadedFiles,
      };
      console.log(updatedUserUploadedFiles, "updatedUserUploadedFiles")

      // const userUpdateDto: UpdateUserDto = {
      //   uploadedFiles: [...updateInUser.uploadedFiles, fileId],
      // };
      await this.userService.update(updateInUser._id, userUpdateDto);

      
      return updatedFile;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }


    //before permissions delete
  // async removeManyFiles(
  //   companyId: Types.ObjectId | string,
  //   userId: Types.ObjectId | string,
  //   id: Types.ObjectId | string,
  // ) {
  //   if (!companyId || !userId) throw new UnauthorizedException();

  //   try {
  //     const deletedFiles = await this.fileModel.deleteMany({ fileOwnerId: id });

  //     if (deletedFiles.deletedCount === 0) {
  //       throw new NotFoundException('No files found for this user to delete.');
  //     }

  //     return deletedFiles;
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

  

  async removeManyFiles(companyId: Types.ObjectId | string, userId: Types.ObjectId | string, id: Types.ObjectId | string) {
    if (!companyId || !userId) throw new UnauthorizedException();
    try {
      const filesToDelete = await this.fileModel.find({ fileOwnerId: id, fileOwnerCompanyId: companyId });
      
      if (filesToDelete.length === 0) {
        console.log("No files found for this user to delete.");
        return { message: 'No files to delete for this user.' };
      }
  
      // Proceed to remove the files (assuming there is some logic to delete them)
      await this.fileModel.deleteMany({ fileOwnerId: id, fileOwnerCompanyId: companyId });
  
      return { message: 'Files deleted successfully.' };
    } catch (error) {
      console.error('Error removing files:', error);
      throw new NotFoundException('Error deleting files');
    }
  }
  












  async updateFilePermissions(fileId: Types.ObjectId, parsedPermissions: any[]) {
    try {
      // Convert fileId to ObjectId if it's a string
      const objectId = new Types.ObjectId(fileId); // Ensure fileId is an ObjectId

      // Perform the update operation
      const result = await this.fileModel.updateOne(
        { _id: objectId },
        { $set: { userPermissions: parsedPermissions } }
      );

      // Check if the file was updated (check the modifiedCount property)
      if (result.modifiedCount === 0) {
        throw new NotFoundException('File not found or no changes made');
      }

      // Return success or the updated document
      return { message: 'File permissions updated successfully' };
    } catch (error) {
      console.error('Error updating file permissions:', error);
      throw new UnauthorizedException('Error updating file permissions');
    }
  }
  
}
