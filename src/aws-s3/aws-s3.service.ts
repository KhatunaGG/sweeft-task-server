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

  async getFileById(fileId: string) {
    try {
      if (!fileId) throw new NotFoundException('Not found');
      const config = {
        Key: `sweeft-task/${fileId}`,
        Bucket: this.bucketName,
      };
      const getCommand = new GetObjectCommand(config);
      const response = await this.s3.send(getCommand);

      const streamToBuffer = (stream) => {
        return new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      };

      if (!streamToBuffer) {
        throw new NotFoundException('File not found');
      }
      const contentType = response.ContentType;
      const buffer = await streamToBuffer(response.Body);

      return {
        buffer,
        contentType,
      };
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async deleteFileByFileId(fileId: string) {
    try {
      if (!fileId) return;
      const config = {
        // Key: fileId,
        Key: `sweeft-task/${fileId}`,
        Bucket: this.bucketName,
      };
      const deleteCommand = new DeleteObjectCommand(config);
      await this.s3.send(deleteCommand);
      return `Deleted successfully: ${fileId}`;
    } catch (e) {
      console.log(e);
    }
  }

  async deleteManyFiles(fileIds: string[]) {
    try {
      if (!fileIds || fileIds.length === 0) return 'No files to delete';
      
      let deletedCount = 0;
      for (const fileId of fileIds) {
        const config = {
          Key: `sweeft-task/${fileId}`,
          Bucket: this.bucketName,
        };
        const deleteCommand = new DeleteObjectCommand(config);
        await this.s3.send(deleteCommand);
        deletedCount++;
      }
      
      return `Successfully deleted ${deletedCount} files`;
    } catch (e) {
      console.error('Error deleting multiple files:', e);
      throw new BadRequestException('Could not delete files');
    }
  }
}
