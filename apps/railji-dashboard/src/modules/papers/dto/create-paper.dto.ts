import {
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocalizedTextDto {
  @IsOptional()
  en: string;

  @IsOptional()
  hi: string;
}

class OptionDto {
  @IsOptional()
  en: string;

  @IsOptional()
  hi: string;
}

class QuestionDetailDto {
  @IsOptional()
  en: string;

  @IsOptional()
  hi: string;
}

class QuestionDto {
  @IsNumber()
  id: number;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  question: LocalizedTextDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  @ArrayMinSize(4)
  options: OptionDto[];

  @IsNumber()
  correct: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDetailDto)
  details?: QuestionDetailDto[];
}

export class CreatePaperDto {
  @ValidateIf((o) => o.paperType !== 'general')
  @IsString()
  @IsOptional()
  departmentId: string;

  @ValidateIf((o) => o.paperType !== 'full')
  @IsString()
  @IsOptional()
  paperCode: string;

  @IsEnum(['general', 'sectional', 'full'])
  paperType: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  year: number;

  @IsString()
  shift: string;

  @IsNumber()
  totalQuestions: number;

  @IsNumber()
  duration: number;

  @IsNumber()
  passPercentage: number;

  @IsNumber()
  negativeMarking: number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  usersAttempted?: number;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @Type(() => Object)
  metadata?: { filename?: string };

  @IsOptional()
  @IsString()
  username?: string;
}
