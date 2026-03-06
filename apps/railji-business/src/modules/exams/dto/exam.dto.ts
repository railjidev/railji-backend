import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResponseDto {
  @IsNumber()
  @IsNotEmpty()
  questionId: number;

  @IsNumber()
  @IsNotEmpty()
  selectedOption: number;

  @IsBoolean()
  @IsNotEmpty()
  isFlagged: boolean;
}

export class DeviceInfoDto {
  @IsString()
  @IsNotEmpty()
  browser: string;

  @IsString()
  @IsNotEmpty()
  os: string;

  @IsString()
  @IsNotEmpty()
  device: string;

  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @IsString()
  @IsNotEmpty()
  userAgent: string;
}

export class SubmitExamDto {
  @IsString()
  @IsNotEmpty()
  examId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  paperId: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponseDto)
  responses: ResponseDto[];

  @IsNumber()
  @IsOptional()
  attemptedQuestions?: number;

  @IsNumber()
  @IsOptional()
  unattemptedQuestions?: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class StartExamDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  paperId: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;
}

export class GetExamsByUserIdDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
