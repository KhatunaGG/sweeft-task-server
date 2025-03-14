import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { CreateCompanyDto } from 'src/company/dto/create.company.dto';
import { SignInDto } from './dto/sign-in.dto';
import { EmailSenderService } from 'src/email-sender/email-sender.service';

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
    console.log(token, "token")
    return this.authService.verifyEmail(token);
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
