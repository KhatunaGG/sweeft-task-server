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
// import { VerifyEmailDto } from './dto/verify.email.dto';
import * as bcrypt from 'bcrypt';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
import { Company } from 'src/company/decorators/company.decorator';
import { CompanyService } from 'src/company/company.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => FileService)) private fileService: FileService,
    // private fileService: FileService,
    private emailSender: EmailSenderService,
    private companyService: CompanyService,
    private jwtService: JwtService,
  ) {}

  async create(companyId, createUserDto: CreateUserDto) {
    if (!companyId) {
      throw new ForbiddenException('Permission denied');
    }
    try {
      const { userEmail } = createUserDto;
      if (!userEmail) {
        throw new BadRequestException('User Email is required');
      }
      const existingUser = await this.userModel.findOne({ userEmail });
      if (existingUser) {
        throw new BadRequestException('User already exists');
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
      return {
        message: 'User added successfully',
        status: 'success',
      };
    } catch (e) {
      console.log('Error creating user:', e);
      // throw e;
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
      // throw e;
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
      console.log('Error creating user:', e);
      // throw e;

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
  ) {
    if (!userId || !companyId) {
      throw new UnauthorizedException();
    }
    if (companyId.toString() === userId.toString()) {
      return await this.userModel.find();
    } else {
      const user = await this.userModel.findById(userId).select('+Password');
      return [user];
    }
  }

  findOne(query) {
    return this.userModel.findOne(query);
  }

  findUserByPassword(query: { userEmail: string }) {
    return this.userModel.findOne(query).select('+userPassword');
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  //before permissions delete
  // async remove(
  //   companyId: Types.ObjectId | string,
  //   userId: Types.ObjectId | string,
  //   id: Types.ObjectId | string,
  // ) {
  //   if (!companyId || !userId) throw new UnauthorizedException();
  //   try {
  //     if (companyId.toString() !== userId.toString()) {
  //       throw new UnauthorizedException(
  //         'You are not authorized to delete this user',
  //       );
  //     }
  //     const userToDelete = await this.userModel.findById(id);
  //     if (!userToDelete) throw new NotFoundException('User not found');

  //     const deleteUsersFiles = await this.fileService.removeManyFiles(
  //       companyId,
  //       userId,
  //       id,
  //     );
  //     const deletedUser = await this.userModel.findByIdAndDelete(id);
  //     if (!deletedUser) throw new NotFoundException('User not found');

  //     return {
  //       message: 'User and associated files deleted successfully',
  //     };
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

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
      const filteredFiles = await this.fileService.findAll(userId, companyId);
      if (!filteredFiles || filteredFiles.length === 0) {
        console.log('No files found for this user to delete.');
      }

      for (const file of filteredFiles) {
        const parsedPermissions = file.userPermissions
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
          .flat();
        const permissionIndex = parsedPermissions.findIndex(
          (permission) => permission.permissionById === id.toString(),
        );
        if (permissionIndex !== -1) {
          parsedPermissions.splice(permissionIndex, 1);

          await this.fileService.updateFilePermissions(
            file._id,
            parsedPermissions,
          );
        }

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
}
