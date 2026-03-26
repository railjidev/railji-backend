import { IsString, IsOptional } from 'class-validator';

export class RevokeAccessDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  paperId?: string;
}