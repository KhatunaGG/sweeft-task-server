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
      let payload: PayloadType;
      if (isCompany) {
        payload = {
          sub: result._id,
          role: result.role as Role,
          subscription: result.subscriptionPlan,
        };
      } else if (isUser) {
        payload = {
          sub: result._id,
          role: result.role as Role,
          userId: result._id,
        };
      }
      const accessToken = await this.jwtService.signAsync(payload);
      return { accessToken };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  // async updateSubscription(companyId: string, customId: string, updateCompanyDto: UpdateCompanyDto) {
  //   console.log(companyId, "companyId from controller")
  //   console.log(customId, "customId from controller")
  //   console.log(updateCompanyDto, "updateAuthDto from controller")
  //   // return "ok";
  //   try {
  //     if(!companyId)  throw new UnauthorizedException('Company ID is required');
  //     if(!updateCompanyDto)  throw new BadRequestException();
  //     const company = await this.companyService.getById(companyId)
  //     if(!company) throw new BadRequestException('Not found')
  //     const updatedCompany = {...company, updateCompanyDto}

  //     const updatedSubscription  = await this.companyService.updateSubscription(companyId, updateCompanyDto)
  //     console.log(updatedSubscription, "updatedSubscription")
  //     // return {message: "The company subscription has been successfully updated."}

  //   } catch(e) {
  //     console.log(e)
  //     throw e
  //   }
  // }

  //with userId
  // async getCurrentUser(userId: string) {
  //   try {
  //     const existingCompany = await this.companyService.getById(userId);
  //     return existingCompany;
  //   } catch (error) {
  //     console.log(error);
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
      const updatedCompanyDto = {
        ...company.toObject(),
        ...updateCompanyDto,
      };
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

  //START - OK, BEFORE USER
  // async getCurrentUser(companyId: string) {
  //   try {
  //     const existingCompany = await this.companyService.getById(companyId);
  //     return existingCompany;
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  // async getCurrentUser(id: string, type: 'company' | 'user') {
  //   try {
  //     if (type === 'company') {
  //       const existingCompany = await this.companyService.getById(id);
  //       return existingCompany;
  //     } else if (type === 'user') {
  //       const existingUser = await this.userService.getById(id);
  //       return existingUser;
  //     }
  //     throw new Error("Invalid type for current user request");
  //   } catch (error) {
  //     console.log(error);
  //     throw error; // Rethrow the error to handle it properly in the controller
  //   }
  // }


  async getCurrentUser(
    id: string,
    type: 'company' | 'user',
    companyId?: string,
  ) {
    try {
      if (type === 'company') {
        const existingCompany = await this.companyService
          .getById(id)
          .select('-password -_id');
        return existingCompany.toObject();
      } else if (type === 'user') {
        const existingUser = await this.userService.getById(id);
        const existingCompany = await this.companyService
          .getById(existingUser.companyId)
          .select('-password -_id');

        const userData = existingUser.toObject();
        const companyData = existingCompany.toObject();

        return {
          user: userData,
          company: companyData,
        };
      }
      throw new Error('Invalid type for current user request');
    } catch (error) {
      console.log(error);
      throw error; 
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

  //*************************** */
  // create(createAuthDto: CreateAuthDto) {
  //   return 'This action adds a new auth';
  // }

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
