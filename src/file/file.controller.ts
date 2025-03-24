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

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload-file')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
    @Body() body: { companyId: string; userPermissions: string[] }, 
  ) {
    const path = Math.random().toString().slice(2);
    const filePath = `sweeft-task/${path}`;
    const fileOwnerId = req.userId ? req.userId : req.companyId;
    const { companyId, userPermissions } = body;
    // console.log(req.userId, "req.userId")
    // console.log(req.companyId, "companyId")
    // console.log(req.role, "role")

    // console.log(userPermissions, "permission from controller")

    
    // return await this.fileService.uploadFile(
    //   filePath,
    //   file.buffer,
    //   fileOwnerId,
    //   companyId,
    //   userPermissions
    // );
  }




  @Post()
  create(@Body() createFileDto: CreateFileDto) {
    return this.fileService.create(createFileDto);
  }

  @Get()
  findAll() {
    return this.fileService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fileService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    return this.fileService.update(+id, updateFileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fileService.remove(+id);
  }
}
