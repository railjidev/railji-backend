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

export class UpdatePaperDto {
  @IsOptional()
  @ValidateIf((o) => o.paperType !== 'general')
  @IsString()
  departmentId?: string;

  @IsOptional()
  @ValidateIf((o) => o.paperType !== 'full')
  @IsString()
  paperCode?: string;

  @IsOptional()
  @IsEnum(['general', 'sectional', 'full'])
  paperType?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  shift?: string;

  @IsOptional()
  @IsNumber()
  totalQuestions?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  passPercentage?: number;

  @IsOptional()
  @IsNumber()
  negativeMarking?: number;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @IsString()
  username?: string;
}
