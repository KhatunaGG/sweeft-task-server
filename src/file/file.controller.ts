import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileService } from './file.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { AuthGuard } from 'src/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Company } from 'src/company/decorators/company.decorator';
import { Types } from 'mongoose';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload-file')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
    @Body()
    body: { companyId: string; userPermissions: string[]; fileName: string },
  ) {
    const path = Math.random().toString().slice(2);
    const filePath = `sweeft-task/${path}`;
    const { companyId, userPermissions, fileName } = body;
    const fileOwnerId = req.userId;
    const fileOwnerCompanyId = req.companyId;
    return await this.fileService.uploadFile(
      filePath,
      file.buffer,
      fileOwnerId,
      fileOwnerCompanyId,
      userPermissions,
      fileName,
    );
  }

  @Patch('/:fileId')
  @UseGuards(AuthGuard)
  async update(
    @Req() req,
    @Body() updateFileDto: UpdateFileDto,
    @Param('fileId') fileId: Types.ObjectId | string,
  ) {
    console.log(fileId, 'fileId from controller');
    await this.fileService.update(
      req.userId,
      req.companyId,
      updateFileDto,
      fileId,
    );
  }

  // @Patch('update-permissions')
  // @UseGuards(AuthGuard)
  // async userPermissions(@Req() req, @Body() body: {fileId: string, userPermissions: [String]} ) {
  //   await this.fileService.updateUserPermissions(req.companyId, body.fileId, body.userPermissions)

  //   return "ok"
  // }

  @Get()
  @UseGuards(AuthGuard)
  findAll(@Req() req, @Company() customId: Types.ObjectId | string) {
    return this.fileService.findAll(req.userId, req.companyId, customId);
  }

  @Post()
  create(@Body() createFileDto: CreateFileDto) {
    return this.fileService.create(createFileDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fileService.findOne(id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
  //   return this.fileService.update(+id, updateFileDto);
  // }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Req() req, @Param('id') id: Types.ObjectId) {
    return this.fileService.remove(req.companyId, req.userId, id);
  }
}
