import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSchema } from './schema/user.schema';
import { AuthGuard } from 'src/guard/auth.guard';
import { Types } from 'mongoose';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req, @Body() createUserDto: CreateUserDto) {
    return this.userService.create(req.companyId, createUserDto);
  }

  // @Post('verify-email')
  // async sendVerificationEmail(@Body()) {
  //   // console.log(body, 'userEmail');
  //   // return await this.userService.sendVerificationEmail(body);
  //   return "ok"
  // }

  @Get('/verify-user')
  verifyUserByVerificationToken(@Query('token') token: string) {
    return this.userService.verifyUserByVerificationToken(token);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll(@Req() req) {
    return this.userService.findAll(req.userId, req.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch('update-user-sign-in')
  updateUserBySignIn(@Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUserBySignIn(updateUserDto);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.userService.update(id, updateUserDto);
  // }

















  @Delete(':id')
  @UseGuards(AuthGuard)
  remove( @Req() req, @Param('id') id) {
    return this.userService.remove(req.companyId, req.userId, id);
  }



















  @Patch('/:id')
  @UseGuards(AuthGuard)
  update(@Req() req, @Param("id") id: string, @Body() updatedUserDto: UpdateUserDto) {
    return this.userService.update(id, updatedUserDto)
  }
}
