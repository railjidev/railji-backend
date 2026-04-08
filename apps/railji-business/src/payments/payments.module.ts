import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './services/payments.service';
import { PaymentGatewayFactory } from './services/payment-gateway.factory';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { PayUGateway } from './gateways/payu.gateway';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schemas/payment-transaction.schema';
import { PAYMENT_GATEWAY_TOKENS } from '../constants/app.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentGatewayFactory,
    PaymentTransactionService,
    // Register gateway implementations with tokens
    {
      provide: PAYMENT_GATEWAY_TOKENS.RAZORPAY,
      useClass: RazorpayGateway,
    },
    {
      provide: PAYMENT_GATEWAY_TOKENS.STRIPE,
      useClass: StripeGateway,
    },
    {
      provide: PAYMENT_GATEWAY_TOKENS.PAYU,
      useClass: PayUGateway,
    },
  ],
  exports: [PaymentsService, PaymentGatewayFactory, PaymentTransactionService],
})
export class PaymentsModule {}
