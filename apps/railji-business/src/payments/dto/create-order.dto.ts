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

export class CreateOrderResponseDto {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  metadata?: Record<string, any>;
  
  // For redirect-based gateways
  redirectUrl?: string;
  
  // For client-side integration
  clientSecret?: string;
}
