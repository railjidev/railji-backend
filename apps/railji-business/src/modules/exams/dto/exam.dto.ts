import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
  IsIn,
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
  paperId: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['mock', 'live'], { message: 'examMode must be either mock or live' })
  examMode: string
}

export class GetExamStatsDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class GetExamHistoryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
