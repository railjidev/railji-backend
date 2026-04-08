import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { PAYMENT_GATEWAY_TOKENS } from '../../constants/app.constants';
import { PaymentGatewayType } from '../config/payment.config';
import { config } from '../../config/config';

@Injectable()
export class PaymentGatewayFactory {
  private readonly logger = new Logger(PaymentGatewayFactory.name);
  private gatewayCache: Map<string, IPaymentGateway> = new Map();

  constructor(
    private readonly moduleRef: ModuleRef,
  ) {}

  getGateway(vendor?: PaymentGatewayType): IPaymentGateway {
    const activeVendor = vendor || (config.payment.gateway as PaymentGatewayType);

    if (!activeVendor) {
      throw new Error('No payment gateway configured');
    }

    // Return cached instance if available
    if (this.gatewayCache.has(activeVendor)) {
      return this.gatewayCache.get(activeVendor);
    }

    // Lazy resolve the gateway instance
    const gateway = this.resolveGateway(activeVendor);
    this.gatewayCache.set(activeVendor, gateway);

    this.logger.log(`Payment gateway resolved: ${activeVendor}`);
    return gateway;
  }

  private resolveGateway(vendor: PaymentGatewayType): IPaymentGateway {
    const tokenMap = {
      razorpay: PAYMENT_GATEWAY_TOKENS.RAZORPAY,
      stripe: PAYMENT_GATEWAY_TOKENS.STRIPE,
      payu: PAYMENT_GATEWAY_TOKENS.PAYU,
    };

    const token = tokenMap[vendor];
    if (!token) {
      throw new Error(`Unknown payment gateway: ${vendor}`);
    }

    try {
      return this.moduleRef.get<IPaymentGateway>(token, { strict: false });
    } catch (error) {
      this.logger.error(`Failed to resolve gateway: ${vendor}`, error);
      throw new Error(`Payment gateway ${vendor} is not available`);
    }
  }

  clearCache(): void {
    this.gatewayCache.clear();
    this.logger.log('Payment gateway cache cleared');
  }
}
