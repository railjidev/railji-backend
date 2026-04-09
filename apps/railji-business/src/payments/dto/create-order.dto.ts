import { IsNumber, IsString, IsOptional, IsObject, Min } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
