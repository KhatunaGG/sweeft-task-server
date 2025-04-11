import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileService } from 'src/file/file.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import mongoose, { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
import { CompanyService } from 'src/company/company.service';
import { JwtService } from '@nestjs/jwt';
import { QueryParamsDto } from 'src/file/dto/query-params.dto';
import { Subscription } from 'src/enums/subscription.enum';
import { AuthService } from 'src/auth/auth.service';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => FileService)) private fileService: FileService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    // private fileService: FileService,
    private emailSender: EmailSenderService,
    private companyService: CompanyService,
    private jwtService: JwtService,

    private awsS3Service: AwsS3Service,
  ) {}

  // async create(companyId, createUserDto: CreateUserDto) {
  //   if (!companyId) {
  //     throw new ForbiddenException('Permission denied');
  //   }
  //   try {
  //     const { userEmail } = createUserDto;
  //     if (!userEmail) {
  //       throw new BadRequestException('User Email is required');
  //     }
  //     const existingUser = await this.userModel.findOne({ userEmail });
  //     if (existingUser) {
  //       throw new BadRequestException('User already exists');
  //     }
  //     const validationToken = crypto.randomUUID();
  //     const validationLinkValidateDate = new Date();
  //     validationLinkValidateDate.setTime(
  //       validationLinkValidateDate.getTime() + 3 * 60 * 1000,
  //     );
  //     const fullValidationLink = `${process.env.FRONTEND_URL}/user-sign-in?token=${validationToken}`;
  //     const newUser = {
  //       userEmail,
  //       companyId,
  //       validationLink: validationToken,
  //       validationLinkValidateDate,
  //       isVerified: false,
  //     };
  //     const createdUser = await this.userModel.create(newUser);
  //     await createdUser.save();
  //     await this.emailSender.sendValidationEmail(
  //       userEmail,
  //       'Dear Colleague',
  //       fullValidationLink,
  //     );
  //     return {
  //       message: 'User added successfully',
  //       status: 'success',
  //     };
  //   } catch (e) {
  //     console.log('Error creating user:', e);
  //     // throw e;
  //     if (e instanceof BadRequestException || e instanceof NotFoundException) {
  //       throw e;
  //     } else {
  //       throw new InternalServerErrorException(
  //         'An unexpected error occurred while sending the verification email',
  //       );
  //     }
  //   }
  // }

  async create(companyId, createUserDto: CreateUserDto, userId) {
    if (!companyId) {
      throw new ForbiddenException('Permission denied');
    }
    if (companyId.toString() !== userId.toString()) {
      throw new ForbiddenException('Permission denied');
    }
    console.log(userId, 'userId');
    console.log(companyId, 'companyId');

    try {
      const { userEmail } = createUserDto;
      if (!userEmail) {
        throw new BadRequestException('User Email is required');
      }
      const existingUser = await this.userModel.findOne({ userEmail });
      if (existingUser) {
        throw new BadRequestException('User already exists');
      }
      const company = await this.companyService.getById(companyId);
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      const startDate = new Date(company.subscriptionUpdateDate);
      const endDate = new Date();
      const usersThisMonth = await this.getUsersAddedInDateRange(
        companyId,
        startDate,
        endDate,
      );

      if (
        company.subscriptionPlan === Subscription.FREE &&
        usersThisMonth.length >= 1
      ) {
        throw new BadRequestException(
          'Free tier allows only 1 user. Please upgrade your subscription to add more users.',
        );
      } else if (
        company.subscriptionPlan === Subscription.BASIC &&
        usersThisMonth.length >= 5
      ) {
        console.log('Basic tier user limit reached. Extra charges will apply.');
      }
      const validationToken = crypto.randomUUID();
      const validationLinkValidateDate = new Date();
      validationLinkValidateDate.setTime(
        validationLinkValidateDate.getTime() + 3 * 60 * 1000,
      );
      const fullValidationLink = `${process.env.FRONTEND_URL}/user-sign-in?token=${validationToken}`;
      const newUser = {
        userEmail,
        companyId,
        validationLink: validationToken,
        validationLinkValidateDate,
        isVerified: false,
      };

      const createdUser = await this.userModel.create(newUser);
      await createdUser.save();
      await this.emailSender.sendValidationEmail(
        userEmail,
        'Dear Colleague',
        fullValidationLink,
      );
      if (
        company.subscriptionPlan === Subscription.BASIC &&
        usersThisMonth.length >= 3
      ) {
        await this.authService.checkSubscription(
          companyId,
          company.subscriptionPlan,
          new Date(),
        );
      }

      return {
        message: 'User added successfully',
        status: 'success',
      };
    } catch (e) {
      console.log('Error creating user:', e);
      if (e instanceof BadRequestException || e instanceof NotFoundException) {
        throw e;
      } else {
        throw new InternalServerErrorException(
          'An unexpected error occurred while sending the verification email',
        );
      }
    }
  }

  async verifyUserByVerificationToken(token: string) {
    try {
      const existingUser = await this.userModel.findOne({
        validationLink: token,
        isVerified: false,
      });
      if (!existingUser) {
        throw new NotFoundException('User not found or already verified');
      }

      const now = new Date();
      if (now > existingUser.validationLinkValidateDate) {
        throw new BadRequestException(
          'Verification link has expired. Please request a new one.',
        );
      }
      const updatedUser = await this.userModel.findByIdAndUpdate(
        existingUser._id,
        {
          isVerified: true,
          validationLink: null,
          validationLinkValidateDate: null,
        },
        { new: true },
      );
      return updatedUser;
    } catch (e) {
      console.error('Error in verifyUserByVerificationToken:', e);
      if (e instanceof BadRequestException || e instanceof NotFoundException) {
        throw e;
      } else {
        throw new InternalServerErrorException(
          'An unexpected error occurred while sending the verification email',
        );
      }
    }
  }

  async updateUserBySignIn(UpdateUserDto: UpdateUserDto) {
    try {
      const { firstName, lastName, userEmail, userPassword } = UpdateUserDto;
      const existingUser = await this.userModel.findOne({ userEmail });

      if (!existingUser) throw new UnauthorizedException();
      if (existingUser.isVerified !== true) throw new UnauthorizedException();
      if (!firstName || !lastName || !userPassword)
        throw new BadRequestException(
          'First Name, Last Name and Password are required',
        );
      const hashedPassword = await bcrypt.hash(userPassword, 10);
      existingUser.userPassword = hashedPassword;
      const updatedData = {
        ...UpdateUserDto,
        userPassword: hashedPassword,
      };
      const updatedUser = await this.userModel.findByIdAndUpdate(
        existingUser._id,
        updatedData,
        { new: true },
      );

      if (updatedUser) {
        const existingUsersCompany = await this.companyService.getById(
          updatedUser.companyId,
        );
        if (!existingUsersCompany) {
          throw new BadGatewayException('Company not found');
        }
        existingUsersCompany.user.push(
          new mongoose.Types.ObjectId(updatedUser._id),
        );
        await existingUsersCompany.save();
      }
      // return { accessToken };

      return { message: 'User registered successfully ' };
    } catch (e) {
      console.log(e);
      if (
        e instanceof BadRequestException ||
        e instanceof NotFoundException ||
        e instanceof UnauthorizedException
      ) {
        throw e;
      } else {
        throw new InternalServerErrorException(
          'An unexpected error occurred while sending the verification email',
        );
      }
    }
  }

  getById(id: string | Types.ObjectId) {
    return this.userModel.findById(id);
  }

  async findAll(
    userId: Types.ObjectId | string,
    companyId: Types.ObjectId | string,
    queryParams: QueryParamsDto,
  ) {
    if (!userId || !companyId) {
      throw new UnauthorizedException();
    }
    let { page, take } = queryParams;
    take = take > 100 ? 100 : take;
    if (companyId.toString() === userId.toString()) {
      return await this.userModel
        .find()
        .skip((page - 1) * take)
        .limit(take);
    } else {
      const user = await this.userModel.findById(userId).select('+Password');
      return [user];
    }
  }

  async getAll(companyId: Types.ObjectId | string) {
    return await this.userModel.find({ companyId: companyId });
  }

  findOne(query) {
    return this.userModel.findOne(query);
  }

  findUserByPassword(query: { userEmail: string }) {
    return this.userModel.findOne(query).select('+userPassword');
  }

  async remove(
    companyId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    id: Types.ObjectId | string,
  ) {
    if (!companyId || !userId) throw new UnauthorizedException();

    try {
      if (companyId.toString() !== userId.toString()) {
        throw new UnauthorizedException(
          'You are not authorized to delete this user',
        );
      }
      const userToDelete = await this.userModel.findById(id);
      if (!userToDelete) throw new NotFoundException('User not found');
      const userOwnedFiles = await this.fileService.findAll(
        userId,
        companyId,
        id,
      );

      if (!userOwnedFiles || userOwnedFiles.length === 0) {
        console.log('No files found for this user to delete.');
      }
      const allCompanyFiles =
        await this.fileService.findAllByCompany(companyId);
      for (const file of allCompanyFiles) {
        if (file.userPermissions && file.userPermissions.length > 0) {
          let permissionsUpdated = false;
          const parsedPermissions = file.userPermissions
            .map((permission) => {
              try {
                return typeof permission === 'string'
                  ? JSON.parse(permission)
                  : permission;
              } catch (error) {
                console.error('Error parsing permission:', error);
                return null;
              }
            })
            .filter((permission) => permission !== null)
            .flat();
          const permissionIndex = parsedPermissions.findIndex(
            (permission) => permission.permissionById === id.toString(),
          );

          if (permissionIndex !== -1) {
            parsedPermissions.splice(permissionIndex, 1);
            permissionsUpdated = true;
          }
          if (permissionsUpdated) {
            await this.fileService.updateFilePermissions(
              file._id,
              parsedPermissions,
            );
          }
        }
      }
      const company = await this.companyService.findById(companyId);
      if (!company) throw new NotFoundException('Company not found');
      const userIndex = company.user.findIndex(
        (userId) => userId.toString() === id.toString(),
      );

      if (userIndex !== -1) {
        company.user.splice(userIndex, 1);
      } else {
        throw new BadGatewayException('User not found in company');
      }
      if (userOwnedFiles && userOwnedFiles.length > 0) {
        const fileIdsToRemove = userOwnedFiles.map((file) =>
          file._id.toString(),
        );

        company.uploadedFiles = company.uploadedFiles.filter(
          (fileId) => !fileIdsToRemove.includes(fileId.toString()),
        );
      }
      await company.save();

      // if (userOwnedFiles && userOwnedFiles.length > 0) {
      //   // Extract file paths for S3 deletion
      //   const filePaths = userOwnedFiles.map(file => file.filePath);

      //   // Delete all files from S3 at once
      //   await this.awsS3Service.deleteManyFiles(filePaths);

      //   // Remove file records from database
      //   await this.fileService.removeManyFiles(companyId, userId, id);
      // }

      for (let file of userOwnedFiles) {
        const path = file.filePath.split('/')[1];
        await this.awsS3Service.deleteFileByFileId(path);
      }

      await this.fileService.removeManyFiles(companyId, userId, id);

      const deletedUser = await this.userModel.findByIdAndDelete(id);
      if (!deletedUser) throw new NotFoundException('User not found');

      return deletedUser;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async update(id: Types.ObjectId | string, updatedUserDto: UpdateUserDto) {
    if (!id || !updatedUserDto) {
      throw new UnauthorizedException();
    }
    try {
      if (!id || !updatedUserDto) {
        throw new BadRequestException('No file or update data found.');
      }
      return await this.userModel.findByIdAndUpdate(id, updatedUserDto, {
        new: true,
      });
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async getUsersAddedInDateRange(
    companyId: Types.ObjectId | string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.userModel
      .find({
        companyId: companyId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .exec();
  }
}
