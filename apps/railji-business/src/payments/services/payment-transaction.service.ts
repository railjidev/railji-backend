import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  TransactionStatus,
  TransactionType,
} from '../schemas/payment-transaction.schema';
import { OrderResult, RefundResult, TransactionResult } from '../interfaces/payment-gateway.interface';

@Injectable()
export class PaymentTransactionService {
  private readonly logger = new Logger(PaymentTransactionService.name);

  constructor(
    @InjectModel(PaymentTransaction.name)
    private transactionModel: Model<PaymentTransactionDocument>,
  ) {}

  async logOrderCreation(
    gateway: string,
    orderResult: OrderResult,
    metadata?: {
      userId?: string;
      customerEmail?: string;
      customerPhone?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<PaymentTransaction> {
    try {
      const transaction = new this.transactionModel({
        transactionId: orderResult.orderId,
        type: TransactionType.ORDER,
        gateway,
        orderId: orderResult.orderId,
        amount: orderResult.amount,
        currency: orderResult.currency,
        status: this.mapStatus(orderResult.status),
        metadata: orderResult.metadata,
        gatewayResponse: orderResult,
        userId: metadata?.userId,
        customerEmail: metadata?.customerEmail,
        customerPhone: metadata?.customerPhone,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      const saved = await transaction.save();
      this.logger.log(`Order logged: ${orderResult.orderId} [${gateway}]`);
      return saved;
    } catch (error) {
      this.logger.error('Failed to log order creation', error);
      throw error;
    }
  }

  async logPaymentVerification(
    gateway: string,
    paymentId: string,
    orderId: string,
    isValid: boolean,
    metadata?: Record<string, any>,
  ): Promise<PaymentTransaction> {
    try {
      const transaction = new this.transactionModel({
        transactionId: `verify_${paymentId}_${Date.now()}`,
        type: TransactionType.VERIFICATION,
        gateway,
        orderId,
        paymentId,
        amount: 0, // Verification doesn't have amount
        currency: 'N/A',
        status: isValid ? TransactionStatus.CAPTURED : TransactionStatus.FAILED,
        metadata,
        gatewayResponse: { isValid, paymentId, orderId },
      });

      const saved = await transaction.save();
      this.logger.log(`Payment verification logged: ${paymentId} [${isValid ? 'SUCCESS' : 'FAILED'}]`);

      // Update the original order status
      if (isValid) {
        await this.updateOrderStatus(orderId, TransactionStatus.CAPTURED);
      }

      return saved;
    } catch (error) {
      this.logger.error('Failed to log payment verification', error);
      throw error;
    }
  }

  async logRefund(
    gateway: string,
    refundResult: RefundResult,
    metadata?: Record<string, any>,
  ): Promise<PaymentTransaction> {
    try {
      const transaction = new this.transactionModel({
        transactionId: refundResult.refundId,
        type: TransactionType.REFUND,
        gateway,
        orderId: refundResult.paymentId, // Link to payment
        paymentId: refundResult.paymentId,
        refundId: refundResult.refundId,
        amount: refundResult.amount,
        currency: 'N/A', // Refund doesn't always return currency
        status: this.mapStatus(refundResult.status),
        metadata,
        gatewayResponse: refundResult,
      });

      const saved = await transaction.save();
      this.logger.log(`Refund logged: ${refundResult.refundId} [${gateway}]`);

      // Update order status to refunded
      await this.updateOrderStatusByPaymentId(
        refundResult.paymentId,
        TransactionStatus.REFUNDED,
      );

      return saved;
    } catch (error) {
      this.logger.error('Failed to log refund', error);
      throw error;
    }
  }

  async logTransaction(
    gateway: string,
    transactionResult: TransactionResult,
  ): Promise<PaymentTransaction> {
    try {
      const transaction = new this.transactionModel({
        transactionId: transactionResult.transactionId,
        type: TransactionType.PAYMENT,
        gateway,
        orderId: transactionResult.orderId,
        paymentId: transactionResult.transactionId,
        amount: transactionResult.amount,
        currency: transactionResult.currency,
        status: this.mapStatus(transactionResult.status),
        method: transactionResult.method,
        metadata: transactionResult.metadata,
        gatewayResponse: transactionResult,
      });

      const saved = await transaction.save();
      this.logger.log(`Transaction logged: ${transactionResult.transactionId} [${gateway}]`);
      return saved;
    } catch (error) {
      this.logger.error('Failed to log transaction', error);
      throw error;
    }
  }

  async logWebhookEvent(
    gateway: string,
    event: string,
    data: Record<string, any>,
  ): Promise<PaymentTransaction> {
    try {
      const transaction = new this.transactionModel({
        transactionId: `webhook_${gateway}_${Date.now()}`,
        type: TransactionType.PAYMENT,
        gateway,
        orderId: data.orderId || data.order_id || 'unknown',
        paymentId: data.paymentId || data.payment_id,
        amount: data.amount || 0,
        currency: data.currency || 'N/A',
        status: this.mapStatus(data.status),
        metadata: { event, webhookData: data },
        gatewayResponse: data,
      });

      const saved = await transaction.save();
      this.logger.log(`Webhook event logged: ${event} [${gateway}]`);

      // Update order status based on webhook event
      if (data.orderId || data.order_id) {
        await this.updateOrderStatus(
          data.orderId || data.order_id,
          this.mapStatus(data.status),
        );
      }

      return saved;
    } catch (error) {
      this.logger.error('Failed to log webhook event', error);
      throw error;
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: TransactionStatus,
  ): Promise<void> {
    try {
      await this.transactionModel.updateMany(
        { orderId, type: TransactionType.ORDER },
        { $set: { status } },
      );
      this.logger.log(`Order status updated: ${orderId} -> ${status}`);
    } catch (error) {
      this.logger.error('Failed to update order status', error);
    }
  }

  async updateOrderStatusByPaymentId(
    paymentId: string,
    status: TransactionStatus,
  ): Promise<void> {
    try {
      await this.transactionModel.updateMany(
        { paymentId },
        { $set: { status } },
      );
      this.logger.log(`Payment status updated: ${paymentId} -> ${status}`);
    } catch (error) {
      this.logger.error('Failed to update payment status', error);
    }
  }

  async getTransactionsByOrderId(orderId: string): Promise<PaymentTransaction[]> {
    return this.transactionModel.find({ orderId }).sort({ createdAt: -1 }).exec();
  }

  async getTransactionsByPaymentId(paymentId: string): Promise<PaymentTransaction[]> {
    return this.transactionModel.find({ paymentId }).sort({ createdAt: -1 }).exec();
  }

  async getTransactionsByUserId(userId: string): Promise<PaymentTransaction[]> {
    return this.transactionModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getTransactionById(transactionId: string): Promise<PaymentTransaction> {
    return this.transactionModel.findOne({ transactionId }).exec();
  }

  private mapStatus(gatewayStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      // Common statuses
      created: TransactionStatus.CREATED,
      authorized: TransactionStatus.AUTHORIZED,
      captured: TransactionStatus.CAPTURED,
      failed: TransactionStatus.FAILED,
      refunded: TransactionStatus.REFUNDED,
      cancelled: TransactionStatus.CANCELLED,

      // Razorpay specific
      attempted: TransactionStatus.PENDING,

      // Stripe specific
      requires_payment_method: TransactionStatus.PENDING,
      requires_confirmation: TransactionStatus.PENDING,
      requires_action: TransactionStatus.PENDING,
      processing: TransactionStatus.PENDING,
      requires_capture: TransactionStatus.AUTHORIZED,
      succeeded: TransactionStatus.CAPTURED,
      canceled: TransactionStatus.CANCELLED,

      // PayU specific
      success: TransactionStatus.CAPTURED,
      failure: TransactionStatus.FAILED,
      pending: TransactionStatus.PENDING,
      
      // Refund statuses
      processed: TransactionStatus.REFUNDED,
      partial: TransactionStatus.PARTIALLY_REFUNDED,
    };

    return statusMap[gatewayStatus?.toLowerCase()] || TransactionStatus.PENDING;
  }
}
