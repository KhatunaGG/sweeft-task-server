import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
  } from '@aws-sdk/client-s3';
  import {
    BadGatewayException,
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { Readable } from 'stream';
  
  @Injectable()
  export class AwsS3Service {
    private bucketName;
    private s3;
    constructor() {
      this.bucketName = process.env.AWS_BUCKET_NAME;
      this.s3 = new S3Client({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION,
      });
    }
  
    async uploadFile(filePath: string, file: Buffer) {
      try {
        if (!filePath || !file) throw new BadGatewayException('File is required');
        const config = {
          Key: filePath,
          Bucket: this.bucketName,
          Body: file,
        };
        const uploadCommand = new PutObjectCommand(config);
        await this.s3.send(uploadCommand);
        // return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;
        return filePath;
      } catch (e) {
        console.error('Error uploading file:', e);
        throw new BadRequestException('Could not upload file');
      }
    }
  
    async getImageById(fileId: string) {
      try {
        if (!fileId) throw new NotFoundException('Not found');
        const config = {
          Key: fileId,
          Bucket: this.bucketName,
        };
        const getCommand = new GetObjectCommand(config);
        const fileStream = await this.s3.send(getCommand);
  
        // if (!fileStream.Body) {
        //   throw new NotFoundException('File not found');
        // }
  
        if (fileStream.Body instanceof Readable) {
          const chunks = [];
          for await (const chunk of fileStream.Body) {
            chunks.push(chunk);
          }
          const fileBuffer = Buffer.concat(chunks);
          const base64 = fileBuffer.toString('base64');
          const file = `data:${fileStream.ContentType};base64,${base64}`;
          return file;
        }
        // throw new NotFoundException('File not found in S3');
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
  
    async deleteImageByFileId(fileId: string) {
      try {
        if (!fileId) return;
        const config = {
          // Key: fileId,
          Key: `sweeft/task/${fileId}`,
          Bucket: this.bucketName,
        };
        const deleteCommand = new DeleteObjectCommand(config);
        await this.s3.send(deleteCommand);
        return `Deleted successfully: ${fileId}`;
      } catch (e) {
        console.log(e);
      }
    }
  }
  