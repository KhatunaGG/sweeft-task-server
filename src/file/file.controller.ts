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
  Res,
  Query,
} from '@nestjs/common';
import { FileService } from './file.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { AuthGuard } from 'src/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { QueryParamsDto } from './dto/query-params.dto';


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
    body: {
      companyId: string;
      userPermissions: string[];
      fileName: string;
      fileExtension: string;
    },
  ) {
    const path = Math.random().toString().slice(2);
    const filePath = `sweeft-task/${path}`;
    const { companyId, userPermissions, fileName, fileExtension } = body;
    const fileOwnerId = req.userId;
    const fileOwnerCompanyId = req.companyId;
    return await this.fileService.uploadFile(
      filePath,
      file.buffer,
      fileOwnerId,
      fileOwnerCompanyId,
      userPermissions,
      fileName,
      fileExtension,
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

  // @Get()
  // @UseGuards(AuthGuard)
  // findAll(@Req() req) {
  //   return this.fileService.findAll(req.userId, req.companyId);
  // }

  @Get('all/')
  @UseGuards(AuthGuard)
  getAllByPage(@Req() req, @Query() queryParams: QueryParamsDto) {
    return this.fileService.getAllByPage(
      req.userId,
      req.companyId,
      queryParams,
    );
  }

  @Post()
  create(@Body() createFileDto: CreateFileDto) {
    return this.fileService.create(createFileDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fileService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Req() req, @Param('id') id: Types.ObjectId) {
    return this.fileService.remove(req.companyId, req.userId, id);
  }

  @Get('/download-file/:id')
  @UseGuards(AuthGuard)
  async downloadFile(@Req() req, @Param() param, @Res() res) {
    try {
      const { id } = param;
      const fileData = await this.fileService.downloadFile(
        req.userId,
        req.companyId,
        id,
      );
      res.setHeader(
        'Content-Type',
        fileData.contentType || 'application/octet-stream',
      );
      res.setHeader('Content-Disposition', fileData.contentDisposition);
      res.setHeader('X-File-Name', fileData.fileName);
      res.setHeader('X-File-Extension', fileData.fileExtension);

      return res.send(fileData.buffer);
    } catch (error) {
      console.error('Download file error:', error);
      throw error;
    }
  }

  @Get('/metadata/:id')
  @UseGuards(AuthGuard)
  async getFileMetadata(@Req() req, @Param() param) {
    try {
      const { id } = param;
      const fileMetadata = await this.fileService.getFileMetadata(
        req.userId,
        req.companyId,
        id,
      );
      return fileMetadata;
    } catch (error) {
      console.error('Get file metadata error:', error);
      throw error;
    }
  }
}
