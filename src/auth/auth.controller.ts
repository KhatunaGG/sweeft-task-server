import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
// import { UpdateAuthDto } from './dto/password-change.dto';
import { CreateCompanyDto } from 'src/company/dto/create.company.dto';
import { SignInDto } from './dto/sign-in.dto';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
import { AuthGuard } from './guard/auth.guard';
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
  getCurrentUser(@Req() req) {
    return this.authService.getCurrentUser(req.companyId);
  }

  @Patch('/update-company')
  @UseGuards(AuthGuard)
  updateCompany(
    @Req() req,
    @Company() customId,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.authService.updateCompany(
      req.companyId,
      customId,
      updateCompanyDto,
    );
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Company() customId,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const { currentPassword, newPassword } = updatePasswordDto;
    return await this.authService.changePassword(customId, currentPassword, newPassword)
  }

  // @Post('/send-email')
  // sendEmail(@Body() body) {
  //   console.log(body, "body ")
  //   const { to, subject, text } = body;
  //   return this.emailSenderService.sendEmailText(to, subject, text);
  // }

  // @Post('send-Html')
  // sendHtml(@Body() body) {
  //   const { to, subject} = body;
  //   console.log(body, "body")
  //   return this.emailSenderService.sendValidationEmail(to, subject);
  // }

  //*************************************************** */
  // @Post()
  // create(@Body() createAuthDto: CreateAuthDto) {
  //   return this.authService.create(createAuthDto);
  // }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
  //   return this.authService.update(+id, updateAuthDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.authService.remove(+id);
  // }
}
