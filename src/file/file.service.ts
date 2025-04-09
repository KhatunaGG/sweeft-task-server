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
import mongoose, { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { CompanyService } from 'src/company/company.service';
import { File } from './schema/file.schema';
import { UpdateCompanyDto } from 'src/company/dto/update.company.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { QueryParamsDto } from './dto/query-params.dto';
import { Subscription } from 'src/enums/subscription.enum';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<File>,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    // private userService: UserService,
    private aswS3Service: AwsS3Service,
    private companyService: CompanyService,
  ) {}

  //before additionalCharge:
  async uploadFile(
    filePath: string,
    buffer: Buffer,
    fileOwnerId: Types.ObjectId | string,
    fileOwnerCompanyId: Types.ObjectId | string,
    userPermissions: string[],
    fileName: string,
    fileExtension: string,
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
        fileExtension,
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
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  // async uploadFile(
  //   filePath: string,
  //   buffer: Buffer,
  //   fileOwnerId: Types.ObjectId | string,
  //   fileOwnerCompanyId: Types.ObjectId | string,
  //   userPermissions: string[],
  //   fileName: string,
  //   fileExtension: string,
  // ) {
  //   try {
  //     if (!fileOwnerCompanyId) {
  //       throw new UnauthorizedException('User ID or Company ID is required.');
  //     }
  //     const company = await this.companyService.getById(fileOwnerCompanyId);
  //     if (!company) throw new UnauthorizedException('Company not found');
  //     const subscriptionPlan = company.subscriptionPlan;
  //     const currentDate = new Date()
  //     const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  //     const filesThisMonth = await this.fileModel.countDocuments({
  //       fileOwnerCompanyId,
  //       createdAt: { $gte: startOfMonth },
  //     });

  //     let additionalCharge = 0;
  //     if (subscriptionPlan === Subscription.FREE && filesThisMonth >= 10) {
  //       throw new BadRequestException('You have reached the upload limit for the free plan. Upgrade your plan to upload more files.');
  //     }
  //     if (subscriptionPlan === Subscription.PREMIUM && filesThisMonth > 20) {
  //       additionalCharge = (filesThisMonth - 20) * 0.50;
  //     }

  //     const filePathFromAws = await this.aswS3Service.uploadFile(
  //       filePath,
  //       buffer,
  //     );
  //     if (!filePathFromAws) {
  //       throw new NotFoundException('File not found');
  //     }

  //     const file = new this.fileModel({
  //       fileOwnerId,
  //       fileOwnerCompanyId,
  //       filePath: filePathFromAws,
  //       userPermissions,
  //       fileName,
  //       fileExtension,
  //       additionalCharge: additionalCharge ? additionalCharge : 0
  //     });
  //     const newFile = await this.fileModel.create(file);
  //     if (newFile) {
  //       const existingCompany =
  //         await this.companyService.getById(fileOwnerCompanyId);
  //       if (!existingCompany) return;

  //       existingCompany.uploadedFiles.push(
  //         new mongoose.Types.ObjectId(file._id),
  //       );
  //       await existingCompany.save();
  //       const existingUser = await this.userService.getById(fileOwnerId);
  //       if (!existingUser) return;
  //       existingUser.uploadedFiles.push(new mongoose.Types.ObjectId(file._id));
  //       await existingUser.save();
  //     }
  //     return {
  //       uploadedFile: newFile,
  //       filePathFromAws,
  //     };
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

  async findAll(
    userId: Types.ObjectId | string,
    companyId: Types.ObjectId | string,
    id: Types.ObjectId | string,
  ) {
    try {
      if (!userId || !companyId) throw new UnauthorizedException();
      return await this.fileModel.find({ fileOwnerId: id });
    } catch (e) {
      console.log(e);
      throw e;
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

  // async remove(companyId: string, userId: string, id: Types.ObjectId) {
  //   try {
  //     if (!companyId || !userId) throw new UnauthorizedException();
  //     if (!id) throw new BadGatewayException('File ID is required');

  //     const deletedFile = await this.fileModel.findByIdAndDelete(id);
  //     if (!deletedFile) throw new NotFoundException('File not found');

  //     const awsFileId = deletedFile.filePath.split('/')[1];
  //     const deletedFilePath =
  //       await this.aswS3Service.deleteFileByFileId(awsFileId);

  //     const company = await this.companyService.findById(companyId);
  //     if (!company) throw new NotFoundException('Company not found');
  //     const companyFileIndex  = company.uploadedFiles.indexOf(id);
  //     console.log(companyFileIndex, "companyFileIndex")
  //     if (companyFileIndex  === -1) {
  //       throw new NotFoundException(
  //         'File ID not found in company uploaded files',
  //       );
  //     }
  //     company.uploadedFiles.splice(companyFileIndex, 1);
  //     const user = await this.userService.getById(userId);
  //     if (!user) {
  //       return;
  //     }
  //     const userFileIndex  = user.uploadedFiles.indexOf(id);
  //     if (userFileIndex  === -1) {
  //       throw new NotFoundException(
  //         'File ID not found in company uploaded files',
  //       );
  //     }
  //     user.uploadedFiles.splice(userFileIndex, 1);

  //     await this.companyService.updateCompany(companyId, { uploadedFiles: company.uploadedFiles });

  //     console.log(company, "company after delete file")

  //  if (user) {
  //     await this.userService.update(userId, { uploadedFiles: user.uploadedFiles });
  //   }

  //     await company.save();
  //     await user.save();
  //     return 'File successfully removed from Company and Users';
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

  // async remove(companyId: string, userId: string, id: Types.ObjectId | string) {
  //   try {
  //     if (!companyId || !userId) throw new UnauthorizedException();
  //     if (!id) throw new BadGatewayException('File ID is required');

  //     // Properly convert the ID to ObjectId if needed
  //     let fileId: Types.ObjectId;
  //     if (typeof id === 'string') {
  //       fileId = new Types.ObjectId(id);
  //     } else {
  //       fileId = id;
  //     }

  //     console.log('Attempting to delete file with ID:', fileId);

  //     // Delete the file document
  //     const deletedFile = await this.fileModel.findByIdAndDelete(fileId);
  //     if (!deletedFile) throw new NotFoundException('File not found');

  //     // Delete from AWS S3 if needed
  //     const awsFileId = deletedFile.filePath.split('/')[1];
  //     const deletedFilePath = await this.aswS3Service.deleteFileByFileId(awsFileId);

  //     // Since we can't use $pull directly, first get the current arrays
  //     const company = await this.companyService.findById(companyId);
  //     if (!company) throw new NotFoundException('Company not found');

  //     // Convert to strings and filter out the ID we want to remove
  //     const fileIdStr = fileId.toString();
  //     const updatedUploadedFiles = company.uploadedFiles.filter(
  //       fileObjId => fileObjId.toString() !== fileIdStr
  //     );

  //     console.log('Original uploadedFiles length:', company.uploadedFiles.length);
  //     console.log('Updated uploadedFiles length:', updatedUploadedFiles.length);

  //     // Update company with the new array
  //     const updatedCompany = await this.companyService.updateCompany(
  //       companyId,
  //       { uploadedFiles: updatedUploadedFiles }
  //     );

  //     // Update user if they exist
  //     const user = await this.userService.getById(userId);
  //     if (user) {
  //       const userUploadedFiles = user.uploadedFiles.filter(
  //         fileObjId => fileObjId.toString() !== fileIdStr
  //       );

  //       console.log('Original user uploadedFiles length:', user.uploadedFiles.length);
  //       console.log('Updated user uploadedFiles length:', userUploadedFiles.length);

  //       await this.userService.update(
  //         userId,
  //         { uploadedFiles: userUploadedFiles }
  //       );
  //     }

  //     return 'File successfully removed from Company and Users';
  //   } catch (e) {
  //     console.log('Error in remove operation:', e);
  //     throw e;
  //   }
  // }

  async remove(
    companyId: string,
    userId: string | any,
    id: Types.ObjectId | string,
  ) {
    try {
      if (!companyId || !userId)
        throw new UnauthorizedException('Company or User not provided');
      if (!id) throw new BadGatewayException('File ID is required');

      let fileId: Types.ObjectId;
      if (typeof id === 'string') {
        fileId = new Types.ObjectId(id);
      } else {
        fileId = id;
      }

      const deletedFile = await this.fileModel.findByIdAndDelete(fileId);
      if (!deletedFile) throw new NotFoundException('File not found');

      const awsFileId = deletedFile.filePath.split('/')[1];
      const deletedFilePath =
        await this.aswS3Service.deleteFileByFileId(awsFileId);

      const company = await this.companyService.findById(companyId);
      if (!company) throw new NotFoundException('Company not found');

      const fileIdStr = fileId.toString();
      const companyFileIndex = company.uploadedFiles.findIndex(
        (fileObjId) => fileObjId.toString() === fileIdStr,
      );
      if (companyFileIndex !== -1) {
        company.uploadedFiles.splice(companyFileIndex, 1);
        await this.companyService.updateCompany(companyId, {
          uploadedFiles: company.uploadedFiles,
        });
      } else {
        console.log('File not found in company uploadedFiles');
      }
      if (userId && typeof userId !== 'string') {
        userId = userId.toString();
      }
      const user = await this.userService.getById(deletedFile.fileOwnerId);
      if (!user) {
        console.log('User not found with ID');
      } else {
        const userFileIndex = user.uploadedFiles.findIndex(
          (fileObjId) => fileObjId.toString() === fileIdStr,
        );
        if (userFileIndex !== -1) {
          user.uploadedFiles.splice(userFileIndex, 1);
          await user.save();
        } else {
          console.log('File not found in user uploadedFiles');
        }
      }

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
      await this.companyService.update(updateInCompany._id, companyUpdateDto);
      const updateInUser = await this.userService.getById(userId);
      if (!updateInUser) return;
      const updatedUserUploadedFiles = updateInUser.uploadedFiles.map((file) =>
        file.toString() === fileId.toString() ? updatedFile._id : file,
      );

      const userUpdateDto: UpdateUserDto = {
        uploadedFiles: updatedUserUploadedFiles,
      };
      await this.userService.update(updateInUser._id, userUpdateDto);

      return updatedFile;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async removeManyFiles(
    companyId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    id: Types.ObjectId | string,
  ) {
    if (!companyId || !userId) throw new UnauthorizedException();
    try {
      const filesToDelete = await this.fileModel.find({
        fileOwnerId: id,
        fileOwnerCompanyId: companyId,
      });

      if (filesToDelete.length === 0) {
        console.log('No files found for this user to delete.');
        return { message: 'No files to delete for this user.' };
      }
      await this.fileModel.deleteMany({
        fileOwnerId: id,
        fileOwnerCompanyId: companyId,
      });

      return { message: 'Files deleted successfully.' };
    } catch (error) {
      console.error('Error removing files:', error);
      throw new NotFoundException('Error deleting files');
    }
  }

  async updateFilePermissions(
    fileId: Types.ObjectId,
    parsedPermissions: any[],
  ) {
    try {
      const objectId = new Types.ObjectId(fileId);

      const result = await this.fileModel.updateOne(
        { _id: objectId },
        { $set: { userPermissions: parsedPermissions } },
      );
      if (result.modifiedCount === 0) {
        throw new NotFoundException('File not found or no changes made');
      }
      return { message: 'File permissions updated successfully' };
    } catch (error) {
      console.error('Error updating file permissions:', error);
      throw new UnauthorizedException('Error updating file permissions');
    }
  }

  async getFileMetadata(
    userId: Types.ObjectId | string,
    companyId: Types.ObjectId | string,
    fileId: string,
  ) {
    try {
      if (!userId || !companyId) throw new UnauthorizedException();
      if (!fileId) throw new BadGatewayException('File ID is required');
      const existingFile = await this.fileModel.findById(fileId).lean();

      if (!existingFile) throw new NotFoundException('File not found');
      let contentType = 'application/octet-stream';
      if (existingFile.contentType) {
        contentType = existingFile.contentType.toString();
      } else if (existingFile.fileExtension) {
        contentType = this.getMimeTypeFromExtension(
          existingFile.fileExtension.toString(),
        );
      }

      return {
        fileName: existingFile.fileName || `file-${fileId}`,
        fileExtension: existingFile.fileExtension || '',
        contentType: contentType,
      };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async downloadFile(
    userId: Types.ObjectId | string,
    companyId: Types.ObjectId | string,
    fileId: string,
  ) {
    try {
      if (!userId || !companyId) throw new UnauthorizedException();
      if (!fileId) throw new BadGatewayException('File ID is required');
      const existingFile = await this.fileModel.findById(fileId).lean();
      if (!existingFile) throw new NotFoundException('File not found');
      const awsId = existingFile.filePath.split('/')[1];
      const fileToDownload = await this.aswS3Service.getFileById(awsId);
      if (!fileToDownload) {
        throw new NotFoundException(`File with ID ${fileId} not found`);
      }
      const fileName = existingFile.fileName || `file-${fileId}`;
      const fileExtension = existingFile.fileExtension || '';
      let contentType = 'application/octet-stream';
      if (fileToDownload.contentType) {
        contentType = fileToDownload.contentType;
      } else if (existingFile.contentType) {
        contentType = existingFile.contentType.toString();
      } else if (fileExtension) {
        contentType = this.getMimeTypeFromExtension(fileExtension.toString());
      }
      const contentDisposition = `attachment; filename="${encodeURIComponent(fileName)}"`;
      return {
        buffer: fileToDownload.buffer,
        contentType: contentType,
        fileName: fileName,
        contentDisposition: contentDisposition,
        fileExtension: fileExtension,
      };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  private getMimeTypeFromExtension(extension: string): string {
    const ext = extension.toLowerCase().replace('.', '');
    const mimeTypes: Record<string, string> = {
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async getUploadedFilesByCompany(
    companyId: Types.ObjectId | string,
    subscriptionUpdateDate: Date,
  ) {
    const startOfMonth = new Date(subscriptionUpdateDate);
    const endOfMonth = new Date(subscriptionUpdateDate);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    return await this.fileModel.find({
      fileOwnerCompanyId: companyId,
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    });
  }

  async getAllByPage(
    userId: Types.ObjectId | string,
    companyId: Types.ObjectId | string,
    queryParams: QueryParamsDto,
  ) {
    try {
      if (!userId || !companyId) throw new UnauthorizedException();
      let { page, take } = queryParams;
      take = take > 100 ? 100 : take;
      const filesTotalLength = (await this.fileModel.find()).length;

      if (!filesTotalLength) {
        console.log('No files found');
      }

      let allFiles;

      if (companyId.toString() === userId.toString()) {
        allFiles = await this.fileModel
          .find({ fileOwnerCompanyId: companyId })
          .skip((page - 1) * take)
          .limit(take)
          .exec();

        if (allFiles.length === 0) {
          return { message: 'No files found for this company.' };
        }
      } else {
        const files = await this.fileModel
          .find({ fileOwnerCompanyId: companyId })
          .skip((page - 1) * take)
          .limit(take)
          .exec();

        if (files && files.length === 0) {
          return { message: 'No files found for this company.' };
        }
        const parsedFiles = files.map((file) => ({
          ...file.toObject(),
          parsedPermissions:
            file.userPermissions.length > 0
              ? file.userPermissions
                  .map((permission) => {
                    try {
                      return typeof permission === 'string'
                        ? JSON.parse(permission)
                        : permission;
                    } catch (error) {
                      console.error('Error parsing permission:', error);
                      return [];
                    }
                  })
                  .flat()
              : [],
        }));

        const filesForAll = parsedFiles.filter(
          (file) => file.parsedPermissions.length === 0,
        );
        const filesForUsers = parsedFiles.filter((file) =>
          file.parsedPermissions.some(
            (permission) => permission.permissionById === userId.toString(),
          ),
        );

        const uniqueFiles = new Map();
        [...filesForAll, ...filesForUsers].forEach((file) => {
          uniqueFiles.set(file._id.toString(), file);
        });

        allFiles = Array.from(uniqueFiles.values());
      }

      return { allFiles, filesTotalLength };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async findAllByCompany(companyId: string | Types.ObjectId) {
    return this.fileModel.find({ fileOwnerCompanyId: companyId.toString() });
  }











  async getUploadedFilesByCompanyInDateRange(
    companyId: string,
    startDate: Date,
    endDate: Date
  ) {
    console.log("File query:", {
      company: companyId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    return this.fileModel.find({
      company: companyId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).exec();
  }
}
