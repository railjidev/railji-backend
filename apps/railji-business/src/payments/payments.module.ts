import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './services/payments.service';
import { PaymentGatewayFactory } from './services/payment-gateway.factory';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schemas/payment-transaction.schema';
import { PAYMENT_GATEWAY_TOKENS } from './config/payment.config';

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
    {
      provide: PAYMENT_GATEWAY_TOKENS.RAZORPAY,
      useClass: RazorpayGateway,
    },
    // Add other gateways here when needed
    // {
    //   provide: PAYMENT_GATEWAY_TOKENS.STRIPE,
    //   useClass: StripeGateway,
    // },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
