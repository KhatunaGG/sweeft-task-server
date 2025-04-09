import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
// import { UpdateAuthDto } from './dto/password-change.dto';
import { CompanyService } from 'src/company/company.service';
import { CreateCompanyDto } from 'src/company/dto/create.company.dto';
import * as bcrypt from 'bcrypt';
import { SignInDto } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
import { UpdateCompanyDto } from 'src/company/dto/update.company.dto';
import { Types } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { Role } from 'src/enums/roles.enum';
import { Subscription } from 'src/enums/subscription.enum';
import { FileService } from 'src/file/file.service';

interface CompanyPayload {
  sub: string;
  role: Role;
  subscription: string;
}

interface UserPayload {
  sub: string;
  role: Role;

  userId: string;
}

type PayloadType = CompanyPayload | UserPayload;

@Injectable()
export class AuthService {
  constructor(
    private readonly companyService: CompanyService,
    private jwtService: JwtService,
    private emailSender: EmailSenderService,
    private userService: UserService,
    private fileService: FileService,
  ) {}

  getAllCompanies() {
    return this.companyService.findAll();
  }

  async signUp(createCompanyDto: CreateCompanyDto) {
    try {
      const { name, email, password, country, industry } = createCompanyDto;
      const existingCompany = await this.companyService.findOne({ email });
      if (existingCompany)
        throw new BadRequestException('Company already exist');
      const hashedPassword = await bcrypt.hash(password, 10);

      const validationToken = crypto.randomUUID();
      const validationLinkValidateDate = new Date();
      validationLinkValidateDate.setTime(
        validationLinkValidateDate.getTime() + 3 * 60 * 1000,
      );
      const fullValidationLink = `${process.env.FRONTEND_URL}/sign-in?token=${validationToken}`;
      const newCompany = await this.companyService.create({
        name,
        email,
        password: hashedPassword,
        country,
        industry,
        validationLink: validationToken,
        validationLinkValidateDate,
        isVerified: false,

        subscriptionUpdateDate: new Date(),
      });
      await this.emailSender.sendValidationEmail(
        email,
        name,
        fullValidationLink,
      );
      return {
        message:
          'Company registered successfully! Please check your email to verify your account.',
      };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async verifyEmail(token: string) {
    try {
      const company = await this.companyService.findOne({
        validationLink: token,
      });
      if (!company) {
        throw new BadRequestException('Invalid verification token');
      }
      const now = new Date();
      if (now > company.validationLinkValidateDate) {
        throw new BadRequestException(
          'Verification link has expired. Please request a new one.',
        );
      }

      await this.companyService.update(company._id, {
        isVerified: true,
        validationLink: null,
        validationLinkValidateDate: null,
      });

      return { message: 'Email verified successfully! You can now log in.' };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  //start before user's sign-in
  // async signIn(signInDto: SignInDto) {
  //   try {
  //     const { email, password } = signInDto;
  //     if (!email || !password)
  //       throw new BadRequestException('Email and Password are required');
  //     const existingCompany = await this.companyService.findCompanyWithPassword(
  //       { email },
  //     );
  //     if (!existingCompany)
  //       throw new BadRequestException('Invalid credentials');
  //     const isPasswordEqual = await bcrypt.compare(
  //       password,
  //       existingCompany.password,
  //     );
  //     if (!isPasswordEqual)
  //       throw new BadRequestException('Invalid credentials');
  //     const payload = {
  //       sub: existingCompany._id,
  //       role: existingCompany.role,
  //       subscription: existingCompany.subscriptionPlan,
  //     };
  //     const accessToken = await this.jwtService.signAsync(payload);
  //     return { accessToken };
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

  async signIn(signInDto: SignInDto) {
    try {
      const { email, password } = signInDto;
      if (!email || !password)
        throw new BadRequestException('Email and Password are required');

      const isCompany = await this.companyService.findOne({ email });
      const isUser = await this.userService.findOne({ userEmail: email });
      if (!isCompany && !isUser) {
        throw new BadRequestException('Invalid credentials');
      }

      let result;
      if (isCompany) {
        result = await this.companyService.findCompanyWithPassword({ email });
      } else if (isUser) {
        result = await this.userService.findUserByPassword({
          userEmail: email,
        });
      }

      if (!result) {
        throw new BadRequestException('Invalid credentials');
      }

      let isPasswordEqual;
      if (isCompany) {
        isPasswordEqual = await bcrypt.compare(password, result.password);
      } else if (isUser) {
        isPasswordEqual = await bcrypt.compare(password, result.userPassword);
      }

      if (!isPasswordEqual)
        throw new BadRequestException('Invalid credentials');

      let payload = {
        sub: isCompany ? result._id : result.companyId,
        role: result.role,
        userId: isCompany ? result._id : result._id,
        subscription: result.subscriptionPlan,
      };

      const accessToken = await this.jwtService.signAsync(payload);
      return { accessToken };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  //before extraUserCharge;
  // async updateCompany(
  //   companyId: string,
  //   customId: string,
  //   updateCompanyDto: UpdateCompanyDto,
  // ) {
  //   try {
  //     if (!companyId) throw new UnauthorizedException('Company ID is required');
  //     if (!updateCompanyDto)
  //       throw new BadRequestException('Update data is required');
  //     const company = await this.companyService.getById(companyId);
  //     if (!company) throw new BadRequestException('Company not found');
  //     const updatedCompanyDto = {
  //       ...company.toObject(),
  //       ...updateCompanyDto,
  //     };
  //     if (updateCompanyDto.subscriptionPlan && updateCompanyDto.subscriptionPlan !== company.subscriptionPlan) {
  //       updatedCompanyDto.subscriptionUpdateDate = new Date();
  //     }
  //     const updatedCompany = await this.companyService.updateCompany(
  //       companyId,
  //       updatedCompanyDto,
  //     );
  //     return { message: 'The company data has been successfully updated.' };
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

  // async updateCompany(
  //   companyId: string,
  //   customId: string,
  //   updateCompanyDto: UpdateCompanyDto,
  // ) {
  //   try {
  //     if (!companyId) throw new UnauthorizedException('Company ID is required');
  //     if (!updateCompanyDto)
  //       throw new BadRequestException('Update data is required');
  //     const company = await this.companyService.getById(companyId);
  //     if (!company) throw new BadRequestException('Company not found');
  //     const updatedCompanyDto = {
  //       ...company.toObject(),
  //       ...updateCompanyDto,
  //     };
  //     if (
  //       updateCompanyDto.subscriptionPlan &&
  //       updateCompanyDto.subscriptionPlan !== company.subscriptionPlan
  //     ) {
  //       updatedCompanyDto.subscriptionUpdateDate = new Date();

  //       const { subscriptionPlan } = updatedCompanyDto;
  //       let premiumCharge = 0;
  //       let extraUserCharge = 0;
  //       let extraFileCharge = 0;

  //       const users = await this.userService.getAll(companyId);
  //       const uploadedFilesThisMonth =
  //         await this.fileService.getUploadedFilesByCompany(
  //           companyId,
  //           updatedCompanyDto.subscriptionUpdateDate,
  //         );

  //       const currentDate = new Date();
  //       const subscriptionMonth =
  //         updatedCompanyDto.subscriptionUpdateDate.getMonth();
  //       const subscriptionYear =
  //         updatedCompanyDto.subscriptionUpdateDate.getFullYear();

  //       if (
  //         currentDate.getMonth() === subscriptionMonth &&
  //         currentDate.getFullYear() === subscriptionYear
  //       ) {
  //         if (subscriptionPlan === Subscription.FREE) {
  //           if (users.length > 1) {
  //             throw new BadRequestException(
  //               'You have reached the limit for the free plan. Upgrade your plan to add more users.',
  //             );
  //           }
  //           if (uploadedFilesThisMonth.length > 10) {
  //             throw new BadRequestException(
  //               'You have reached the upload limit for the free plan. Upgrade your plan to upload more files.',
  //             );
  //           }
  //         }

  //         if (subscriptionPlan === Subscription.BASIC) {
  //           if (users.length > 5) {
  //             extraUserCharge = (users.length - 5) * 5;
  //           }
  //           if (uploadedFilesThisMonth.length > 10) {
  //             extraFileCharge = (uploadedFilesThisMonth.length - 10) * 0.5;
  //           }
  //         }

  //         if (subscriptionPlan === Subscription.PREMIUM) {
  //           premiumCharge = 300;
  //           if (uploadedFilesThisMonth.length > 20) {
  //             extraFileCharge = (uploadedFilesThisMonth.length - 20) * 0.5;
  //           }
  //         }
  //       }

  //       updatedCompanyDto.premiumCharge = premiumCharge;
  //       updatedCompanyDto.extraUserCharge = extraUserCharge;
  //       updatedCompanyDto.extraFileCharge = extraFileCharge;
  //     }

  //     const updatedCompany = await this.companyService.updateCompany(
  //       companyId,
  //       updatedCompanyDto,
  //     );
  //     return { message: 'The company data has been successfully updated.' };
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }

  async updateCompany(
    companyId: string,
    customId: string,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    try {
      if (!companyId) throw new UnauthorizedException('Company ID is required');
      if (!updateCompanyDto)
        throw new BadRequestException('Update data is required');
      const company = await this.companyService.getById(companyId);
      if (!company) throw new BadRequestException('Company not found');
  
      const currentDate = new Date();
      const lastUpdateMonth = company.subscriptionUpdateDate.getMonth();
      const lastUpdateYear = company.subscriptionUpdateDate.getFullYear();
      
      // Ensure proper Date objects for comparison
      const startDate = new Date(company.subscriptionUpdateDate);
      const endDate = new Date(currentDate);
  
      // Get users added in the current subscription period
      const usersCurrentMonth = await this.userService.getUsersAddedInDateRange(
        companyId,
        startDate,
        endDate,
      );
  
      // Get files uploaded in the current subscription period
      const fileCurrentMonth = await this.fileService.getUploadedFilesByCompanyInDateRange(
        companyId,
        startDate,
        endDate,
      );
  
      // Corrected console.log statements with proper formatting
      console.log("usersCurrentMonth", usersCurrentMonth);
      console.log("fileCurrentMonth", fileCurrentMonth);
  
      // Check limits for free plan before any changes
      if (company.subscriptionPlan === Subscription.FREE) {
        if (usersCurrentMonth.length > 1) {
          throw new BadRequestException(
            'You have reached the limit for the free plan. Upgrade your plan to add more users.',
          );
        }
        if (fileCurrentMonth.length > 10) {
          throw new BadRequestException(
            'You have reached the upload limit for the free plan. Upgrade your plan to upload more files.',
          );
        }
      }
      
      // Handle subscription plan change
      if (
        updateCompanyDto.subscriptionPlan &&
        updateCompanyDto.subscriptionPlan !== company.subscriptionPlan
      ) {
        // Check if an update has already occurred this month
        if (
          currentDate.getMonth() === lastUpdateMonth &&
          currentDate.getFullYear() === lastUpdateYear
        ) {
          throw new BadRequestException(
            'Subscription plan can only be updated once per month. Please try again next month.',
          );
        }
  
        // If not in the same month or no previous update, proceed with the update
        const updatedCompanyDto = {
          ...company.toObject(),
          ...updateCompanyDto,
          subscriptionUpdateDate: currentDate,
        };
  
        const { subscriptionPlan } = updatedCompanyDto;
        let premiumCharge = 0;
        let extraUserCharge = 0;
        let extraFileCharge = 0;
  
        // Apply subscription constraints and calculate charges
        if (subscriptionPlan === Subscription.FREE) {
          if (usersCurrentMonth.length > 1) {
            throw new BadRequestException(
              'You have reached the limit for the free plan. Upgrade your plan to add more users.',
            );
          }
          if (fileCurrentMonth.length > 10) {
            throw new BadRequestException(
              'You have reached the upload limit for the free plan. Upgrade your plan to upload more files.',
            );
          }
        }
  
        if (subscriptionPlan === Subscription.BASIC) {
          if (usersCurrentMonth.length > 5) {
            extraUserCharge = (usersCurrentMonth.length - 5) * 5;
          }
          if (fileCurrentMonth.length > 10) {
            extraFileCharge = (fileCurrentMonth.length - 10) * 0.5;
          }
        }
  
        if (subscriptionPlan === Subscription.PREMIUM) {
          premiumCharge = 300;
          if (fileCurrentMonth.length > 20) {
            extraFileCharge = (fileCurrentMonth.length - 20) * 0.5;
          }
        }
  
        updatedCompanyDto.premiumCharge = premiumCharge;
        updatedCompanyDto.extraUserCharge = extraUserCharge;
        updatedCompanyDto.extraFileCharge = extraFileCharge;
  
        const updatedCompany = await this.companyService.updateCompany(
          companyId,
          updatedCompanyDto,
        );
        return {
          message: 'The company subscription has been successfully updated.',
        };
      } else {
        // If we're not updating the subscription plan, just update other fields
        const updatedCompanyDto = {
          ...company.toObject(),
          ...updateCompanyDto,
        };
  
        const updatedCompany = await this.companyService.updateCompany(
          companyId,
          updatedCompanyDto,
        );
        return { message: 'The company data has been successfully updated.' };
      }
    } catch (e) {
      console.log(e);
      throw e;
    }
  }


  async getCurrentUser(userId: string, companyId: string, role: string) {
    if (!companyId || !userId) {
      throw new UnauthorizedException();
    }
    try {
      const existingUser = await this.userService.getById(userId);
      const existingCompany = await this.companyService
        .getById(companyId)
        .populate('uploadedFiles');
      return {
        company: existingCompany,
        user: existingUser,
      };
    } catch (error) {
      console.log(error);
    }
  }

  async changePassword(
    customId: string | Types.ObjectId,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      if (!customId) throw new UnauthorizedException('User ID is required');
      if (!currentPassword || !newPassword) {
        throw new BadRequestException(
          'Current password and new password are required',
        );
      }
      const company = await this.companyService.findCompanyWithPassword({
        _id: customId,
      });
      if (
        !company ||
        !company.password ||
        typeof company.password !== 'string'
      ) {
        throw new BadRequestException('Invalid stored password');
      }

      const isPasswordCorrect = await bcrypt.compare(
        currentPassword,
        company.password,
      );
      if (!isPasswordCorrect) {
        throw new BadRequestException('Current password is incorrect');
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.companyService.updateCompany(customId, {
        password: hashedPassword,
      });
      return { message: 'Password changed successfully' };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
