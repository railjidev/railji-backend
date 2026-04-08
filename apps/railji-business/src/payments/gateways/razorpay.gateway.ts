import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IPaymentGateway,
  OrderResult,
  RefundResult,
  TransactionResult,
  WebhookEvent,
} from '../interfaces/payment-gateway.interface';
import {
  PaymentOrderCreationException,
  PaymentRefundException,
  PaymentNotFoundException,
  PaymentGatewayNotConfiguredException,
} from '../exceptions/payment.exception';
import { config } from '../../config/config';

@Injectable()
export class RazorpayGateway implements IPaymentGateway {
  private readonly logger = new Logger(RazorpayGateway.name);
  private razorpay: any;
  private apiKey: string;
  private keySecret: string;

  constructor() {
    this.apiKey = config.payment.razorpay.apiKey;
    this.keySecret = config.payment.razorpay.keySecret;

    if (!this.apiKey || !this.keySecret) {
      this.logger.warn('Razorpay credentials not configured');
      return;
    }

    try {
      // Lazy load Razorpay SDK
      const Razorpay = require('razorpay');
      this.razorpay = new Razorpay({
        key_id: this.apiKey,
        key_secret: this.keySecret,
      });
      this.logger.log('Razorpay gateway initialized');
    } catch (error) {
      this.logger.warn('Razorpay SDK not installed. Install with: npm install razorpay');
    }
  }

  private ensureInitialized(): void {
    if (!this.razorpay) {
      throw new PaymentGatewayNotConfiguredException('razorpay');
    }
  }

  async createOrder(
    amount: number,
    currency: string,
    metadata: Record<string, any>,
  ): Promise<OrderResult> {
    this.ensureInitialized();

    try {
      const options = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency: currency.toUpperCase(),
        receipt: metadata.receipt || `rcpt_${Date.now()}`,
        notes: metadata,
      };

      const order = await this.razorpay.orders.create(options);

      return {
        orderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        status: order.status,
        createdAt: new Date(order.created_at * 1000),
        metadata: order.notes,
      };
    } catch (error) {
      this.logger.error('Razorpay order creation failed', error);
      throw new PaymentOrderCreationException({
        vendor: 'razorpay',
        code: error.error?.code || 'ORDER_CREATION_FAILED',
        message: error.error?.description || error.message,
        raw: error,
      });
    }
  }

  async verifyPayment(paymentId: string, signature: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      // For Razorpay, signature verification requires orderId|paymentId
      // This is a simplified version - in production, pass orderId as well
      const generated = crypto
        .createHmac('sha256', this.keySecret)
        .update(paymentId)
        .digest('hex');

      return generated === signature;
    } catch (error) {
      this.logger.error('Razorpay payment verification failed', error);
      return false;
    }
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    this.ensureInitialized();

    try {
      const refundData: any = { payment_id: paymentId };
      if (amount) {
        refundData.amount = amount * 100; // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);

      return {
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount / 100,
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000),
      };
    } catch (error) {
      this.logger.error('Razorpay refund failed', error);
      throw new PaymentRefundException({
        vendor: 'razorpay',
        code: error.error?.code || 'REFUND_FAILED',
        message: error.error?.description || error.message,
        raw: error,
      });
    }
  }

  async getTransaction(paymentId: string): Promise<TransactionResult> {
    this.ensureInitialized();

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);

      return {
        transactionId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        createdAt: new Date(payment.created_at * 1000),
        metadata: payment.notes,
      };
    } catch (error) {
      this.logger.error('Razorpay transaction fetch failed', error);
      throw new PaymentNotFoundException({
        vendor: 'razorpay',
        code: error.error?.code || 'TRANSACTION_NOT_FOUND',
        message: error.error?.description || error.message,
        raw: error,
      });
    }
  }

  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      this.logger.error('Razorpay webhook signature verification failed', error);
      return false;
    }
  }

  parseWebhookEvent(payload: Buffer): WebhookEvent {
    try {
      const event = JSON.parse(payload.toString());

      return {
        event: event.event,
        vendor: 'razorpay',
        paymentId: event.payload?.payment?.entity?.id,
        orderId: event.payload?.payment?.entity?.order_id,
        status: event.payload?.payment?.entity?.status,
        amount: event.payload?.payment?.entity?.amount
          ? event.payload.payment.entity.amount / 100
          : undefined,
        data: event.payload,
      };
    } catch (error) {
      this.logger.error('Razorpay webhook parsing failed', error);
      throw error;
    }
  }
}
