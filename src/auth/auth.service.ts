import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { CompanyService } from 'src/company/company.service';
import { CreateCompanyDto } from 'src/company/dto/create.company.dto';
import * as bcrypt from 'bcrypt';
import { SignInDto } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
// import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly companyService: CompanyService,
    private jwtService: JwtService,
    private emailSender: EmailSenderService,
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
        companyId: newCompany._id,
      };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async verifyEmail(token: string) {
    console.log(token, 'token from service');
    try {
      const company = await this.companyService.findOne({
        validationLink: token,
      });
      console.log(company, 'company');

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

  async signIn(signInDto: SignInDto) {
    try {
      const { email, password } = signInDto;
      if (!email || !password)
        throw new BadRequestException('Email and Password are required');
      const existingCompany = await this.companyService.findCompanyWithPassword(
        { email },
      );
      if (!existingCompany)
        throw new BadRequestException('Invalid credentials');
      const isPasswordEqual = await bcrypt.compare(
        password,
        existingCompany.password,
      );
      if (!isPasswordEqual)
        throw new BadRequestException('Invalid credentials');
      const payload = {
        sub: existingCompany._id,
      };

      const accessToken = await this.jwtService.signAsync(payload);
      return { accessToken };
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

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
