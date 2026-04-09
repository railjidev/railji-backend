import { Injectable, Inject } from '@nestjs/common';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { PaymentGatewayType, PAYMENT_GATEWAY_TOKENS } from '../config/payment.config';
import { config } from '../../config/config';

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    @Inject(PAYMENT_GATEWAY_TOKENS.RAZORPAY)
    private readonly razorpayGateway: IPaymentGateway,
    // Add other gateways here when needed
    // @Inject(PAYMENT_GATEWAY_TOKENS.STRIPE)
    // private readonly stripeGateway: IPaymentGateway,
  ) {}

  getGateway(type?: PaymentGatewayType): IPaymentGateway {
    const gatewayType = type || (config.payment.gateway as PaymentGatewayType);

    switch (gatewayType) {
      case 'razorpay':
        return this.razorpayGateway;
      // case 'stripe':
      //   return this.stripeGateway;
      // case 'payu':
      //   return this.payuGateway;
      default:
        throw new Error(`Unsupported payment gateway: ${gatewayType}`);
    }
  }

  getActiveGatewayType(): PaymentGatewayType {
    return config.payment.gateway as PaymentGatewayType;
  }
}
