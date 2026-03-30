import {
  IsString,
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaperDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  examId: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsOptional()
  totalQuestions?: number;

  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  paperType?: string;
}

export class UpdatePaperDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  examId?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsOptional()
  totalQuestions?: number;

  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  paperType?: string;
}

export class FetchPapersQueryDto {
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

  @IsString()
  @IsOptional()
  paperType?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  paperCode?: string;

  @IsNumber()
  @IsOptional()
  year?: number;

  @IsString()
  @IsOptional()
  sortBy?: 'name' | 'rating' | 'updatedAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
