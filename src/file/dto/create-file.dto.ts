import { IsNotEmpty, IsString } from "class-validator";

export class CreateFileDto {

    @IsNotEmpty()
    @IsString()
    fileName: string

    @IsNotEmpty()
    @IsString()
    filePath: string;
}
