import { IsString, IsOptional, IsDateString } from 'class-validator';

export class GrantAccessDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  paperId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  paymentRef?: string;

  @IsString()
  @IsOptional()
  paymentGateway?: string;
}
