import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateCompanyDto } from 'src/company/dto/create.company.dto';
import { SignInDto } from './dto/sign-in.dto';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
import { AuthGuard } from '../guard/auth.guard';
import { Company } from 'src/company/decorators/company.decorator';
import { UpdateCompanyDto } from 'src/company/dto/update.company.dto';
import { UpdatePasswordDto } from './dto/update-password.dto.';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private emailSenderService: EmailSenderService,
  ) {}

  @Post('sign-up')
  signUp(@Body() createCompanyDto: CreateCompanyDto) {
    return this.authService.signUp(createCompanyDto);
  }

  @Post('sign-in')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Get('companies')
  getAllCompanies() {
    return this.authService.getAllCompanies();
  }

  @Get('/verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Get('current-user')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Req() req) {
    return await this.authService.getCurrentUser(
      req.userId,
      req.companyId,
      req.role,
    );
  }

  @Patch('/update-company')
  @UseGuards(AuthGuard)
  updateCompany(@Req() req, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.authService.updateCompany(req.companyId, updateCompanyDto);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Company() customId,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const { currentPassword, newPassword } = updatePasswordDto;
    if (!customId) {
      if (!customId) {
        throw new ForbiddenException('Permission denied');
      }
    }
    return await this.authService.changePassword(
      customId,
      currentPassword,
      newPassword,
    );
  }

  @Post('resend-link')
  async resendVerificationLink(@Body('email') email: string) {
    return this.authService.resendVerificationLink(email);
  }
}
