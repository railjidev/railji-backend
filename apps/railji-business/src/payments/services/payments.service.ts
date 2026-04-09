import { Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { PaymentTransactionService } from './payment-transaction.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly transactionService: PaymentTransactionService,
  ) {}

  async createOrder(amount: number, currency: string, metadata: Record<string, any> = {}) {
    this.logger.log(`Creating order: ${amount} ${currency}`);

    const gateway = this.gatewayFactory.getGateway();
    const gatewayType = this.gatewayFactory.getActiveGatewayType();

    const order = await gateway.createOrder(amount, currency, metadata);

    await this.transactionService.logOrderCreation(gatewayType, order, {
      userId: metadata.userId,
      customerEmail: metadata.email,
      customerPhone: metadata.phone,
    });

    return order;
  }

  async verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    this.logger.log(`Verifying payment: ${paymentId}`);

    const gateway = this.gatewayFactory.getGateway();
    const gatewayType = this.gatewayFactory.getActiveGatewayType();

    const isValid = await gateway.verifyPayment(orderId, paymentId, signature);

    await this.transactionService.logPaymentVerification(
      gatewayType,
      paymentId,
      orderId,
      isValid,
      { signature },
    );

    return isValid;
  }

  async handleWebhook(payload: Buffer, signature: string) {
    this.logger.log('Processing webhook');

    const gateway = this.gatewayFactory.getGateway();
    const gatewayType = this.gatewayFactory.getActiveGatewayType();

    const isValid = gateway.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    const event = gateway.parseWebhookEvent(payload);
    this.logger.log(`Webhook event: ${event.event}`);

    await this.transactionService.logWebhookEvent(gatewayType, event.event, event.data);

    return { success: true, event: event.event };
  }

  async getTransaction(orderId: string) {
    return this.transactionService.getTransactionsByOrderId(orderId);
  }

  async getUserTransactions(userId: string) {
    return this.transactionService.getTransactionsByUserId(userId);
  }
}
