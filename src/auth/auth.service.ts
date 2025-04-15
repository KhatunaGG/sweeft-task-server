import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
      // const fullValidationLink = `${"https://sweeft-task-client.vercel.app/"}/sign-in?token=${validationToken}`;
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
        email: email,
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

  async resendVerificationLink(email: string) {
    try {
      const existingCompany = await this.companyService.findOne({ email });

      if (!existingCompany) throw new NotFoundException('User not found');
      if (existingCompany.isVerified)
        throw new BadRequestException('User already verified');

      const now = new Date();
      const resendLimit = 3;
      const windowDuration = 24 * 60 * 60 * 1000;
      let linkResendCount = existingCompany.linkResendCount || 0;
      let firstResendAttemptDate = existingCompany.firstResendAttemptDate;
      if (
        !firstResendAttemptDate ||
        now.getTime() - new Date(firstResendAttemptDate).getTime() >
          windowDuration
      ) {
        linkResendCount = 0;
        firstResendAttemptDate = now;
      }

      if (linkResendCount >= resendLimit) {
        const nextAvailableTime = new Date(
          firstResendAttemptDate.getTime() + windowDuration,
        );
        throw new BadRequestException(
          `Resend limit reached. You can request a new verification link after ${nextAvailableTime.toLocaleString()}`,
        );
      }
      const validationToken = crypto.randomUUID();
      const validationLinkValidateDate = new Date(
        now.getTime() + 3 * 60 * 1000,
      );
      const fullValidationLink = `${process.env.FRONTEND_URL}/sign-in?token=${validationToken}`;
      await this.companyService.update(existingCompany._id, {
        validationLink: validationToken,
        validationLinkValidateDate,
        linkResendCount: linkResendCount + 1,
        firstResendAttemptDate,
      });
      await this.emailSender.sendValidationEmail(
        email,
        existingCompany.name,
        fullValidationLink,
      );

      return {
        message:
          'Verification email resent successfully. Please check your inbox.',
      };
    } catch (e) {
      console.error('Error in resendVerificationLink:', e);
      throw e;
    }
  }

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
  async updateCompany(
    companyId: Types.ObjectId | string,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    try {
      if (!companyId) throw new UnauthorizedException('Company ID is required');
      if (!updateCompanyDto)
        throw new BadRequestException('Update data is required');

      const company = await this.companyService.getById(companyId);
      if (!company) throw new BadRequestException('Company not found');

      const updatedCompanyDto = {
        ...company.toObject(),
        ...updateCompanyDto,
      };
      if (
        updateCompanyDto.subscriptionPlan &&
        updateCompanyDto.subscriptionPlan !== company.subscriptionPlan
      ) {
        updatedCompanyDto.premiumCharge = 0;
        updatedCompanyDto.extraUserCharge = 0;
        updatedCompanyDto.extraFileCharge = 0;
        updatedCompanyDto.subscriptionUpdateDate = new Date();
        await this.checkSubscription(
          companyId,
          updateCompanyDto.subscriptionPlan,
          updatedCompanyDto.subscriptionUpdateDate,
        );
      }
      const updatedCompany = await this.companyService.updateCompany(
        companyId,
        updatedCompanyDto,
      );
      return { message: 'The company data has been successfully updated.' };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async updateSubscription(
    companyId: Types.ObjectId | string,
    newSubscriptionPlan: string,
  ) {
    const company = await this.companyService.getById(companyId);
    if (!company) throw new BadRequestException('Company not found');
    if (company.subscriptionPlan !== newSubscriptionPlan) {
      const currentDate = new Date();
      await this.companyService.updateCompany(companyId, {
        premiumCharge: 0,
        extraUserCharge: 0,
        extraFileCharge: 0,
        subscriptionUpdateDate: currentDate,
      });
      await this.checkSubscription(companyId, newSubscriptionPlan, currentDate);
    } else {
      await this.checkSubscription(
        companyId,
        newSubscriptionPlan,
        company.subscriptionUpdateDate,
      );
    }
    return { message: 'Subscription updated successfully.' };
  }

  async checkSubscription(
    companyId: Types.ObjectId | string,
    updatedSubscriptionPlan: string,
    newUpdateDate: Date,
  ) {
    if (!companyId) throw new UnauthorizedException('Company ID is required');
    const company = await this.companyService.getById(companyId);
    if (!company) throw new BadRequestException('Company not found');

    const subscriptionPlan = updatedSubscriptionPlan;
    const fileCount = company.uploadedFiles.length;
    const currentDate = new Date();
    const startDate = new Date(company.subscriptionUpdateDate);
    const endDate = new Date(currentDate);

    const usersCurrentMonth = await this.userService.getUsersAddedInDateRange(
      companyId,
      startDate,
      endDate,
    );
    let premiumCharge = 0;
    let extraUserCharge = 0;
    let extraFileCharge = 0;
    if (subscriptionPlan === Subscription.FREE) {
      if (usersCurrentMonth.length > 1) {
        throw new BadRequestException(
          'You have reached the user limit for the free plan. Upgrade your plan to add more users.',
        );
      }
      if (fileCount > 5) {
        throw new BadRequestException(
          'You have reached the upload limit for the free plan. Upgrade your plan to upload more files.',
        );
      }
    } else if (subscriptionPlan === Subscription.BASIC) {
      if (usersCurrentMonth.length > 3) {
        extraUserCharge = (usersCurrentMonth.length - 3) * 5;
      }
      if (fileCount > 5) {
        extraFileCharge = (fileCount - 5) * 0.5;
      }
    } else if (subscriptionPlan === Subscription.PREMIUM) {
      premiumCharge = 30;
      if (fileCount > 10) {
        extraFileCharge = (fileCount - 10) * 0.5;
      }
    }
    const updatedCompany = await this.companyService.updateCompany(companyId, {
      premiumCharge,
      extraUserCharge,
      extraFileCharge,
      subscriptionPlan,
      subscriptionUpdateDate: newUpdateDate,
    });

    return { message: 'The company data has been successfully updated.' };
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
}
