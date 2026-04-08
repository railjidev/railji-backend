import { Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import {
  OrderResult,
  RefundResult,
  TransactionResult,
  WebhookEvent,
  IPaymentGateway,
} from '../interfaces/payment-gateway.interface';
import { PaymentGatewayType } from '../config/payment.config';
import { PaymentTransactionService } from './payment-transaction.service';
import { config } from '../../config/config';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly transactionService: PaymentTransactionService,
  ) {}

  private getActiveGateway(): {
    gateway: IPaymentGateway;
    name: PaymentGatewayType;
  } {
    // Get gateway from environment config
    const gatewayName = config.payment.gateway as PaymentGatewayType;
    
    // Resolve gateway instance
    const gateway = this.gatewayFactory.getGateway(gatewayName);
    
    return { gateway, name: gatewayName };
  }

  async createOrder(
    amount: number,
    currency: string,
    metadata: Record<string, any> = {},
  ): Promise<OrderResult> {
    this.logger.log(`Creating order: amount=${amount}, currency=${currency}`);
    
    const { gateway, name } = this.getActiveGateway();
    
    try {
      const result = await gateway.createOrder(amount, currency, metadata);
      
      // Log transaction to database
      await this.transactionService.logOrderCreation(name, result, {
        userId: metadata.userId,
        customerEmail: metadata.email || metadata.customerEmail,
        customerPhone: metadata.phone || metadata.customerPhone,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      
      return result;
    } catch (error) {
      this.logger.error('Order creation failed', error);
      throw error;
    }
  }

  async verifyPayment(
    paymentId: string,
    signature: string,
    orderId?: string,
  ): Promise<boolean> {
    this.logger.log(`Verifying payment: ${paymentId}`);
    
    const { gateway, name } = this.getActiveGateway();
    
    try {
      const isValid = await gateway.verifyPayment(paymentId, signature);
      
      // Log verification to database
      await this.transactionService.logPaymentVerification(
        name,
        paymentId,
        orderId || paymentId,
        isValid,
        { signature },
      );
      
      return isValid;
    } catch (error) {
      this.logger.error('Payment verification failed', error);
      throw error;
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    this.logger.log(`Refunding payment: ${paymentId}, amount=${amount}`);
    
    const { gateway, name } = this.getActiveGateway();
    
    try {
      const result = await gateway.refund(paymentId, amount);
      
      // Log refund to database
      await this.transactionService.logRefund(name, result, {
        requestedAmount: amount,
      });
      
      return result;
    } catch (error) {
      this.logger.error('Refund failed', error);
      throw error;
    }
  }

  async getTransaction(paymentId: string): Promise<TransactionResult> {
    this.logger.log(`Fetching transaction: ${paymentId}`);
    
    const { gateway, name } = this.getActiveGateway();
    
    try {
      const result = await gateway.getTransaction(paymentId);
      
      // Log transaction fetch (optional, for audit)
      await this.transactionService.logTransaction(name, result);
      
      return result;
    } catch (error) {
      this.logger.error('Transaction fetch failed', error);
      throw error;
    }
  }

  async handleWebhook(
    vendor: PaymentGatewayType,
    payload: Buffer,
    signature: string,
  ): Promise<WebhookEvent> {
    this.logger.log(`Processing webhook from: ${vendor}`);
    
    const gateway = this.gatewayFactory.getGateway(vendor);

    // Verify webhook signature
    const isValid = gateway.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Parse and return the event
    const event = gateway.parseWebhookEvent(payload);
    
    // Log webhook event to database
    await this.transactionService.logWebhookEvent(vendor, event.event, event.data);
    
    return event;
  }

  // Additional methods for transaction queries
  async getOrderTransactions(orderId: string) {
    return this.transactionService.getTransactionsByOrderId(orderId);
  }

  async getPaymentTransactions(paymentId: string) {
    return this.transactionService.getTransactionsByPaymentId(paymentId);
  }

  async getUserTransactions(userId: string) {
    return this.transactionService.getTransactionsByUserId(userId);
  }
}
