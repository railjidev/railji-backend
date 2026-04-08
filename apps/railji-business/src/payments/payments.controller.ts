import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './services/payments.service';
import { CreateOrderDto, CreateOrderResponseDto } from './dto/create-order.dto';
import { VerifyPaymentDto, VerifyPaymentResponseDto } from './dto/verify-payment.dto';
import { RefundPaymentDto, RefundPaymentResponseDto } from './dto/refund-payment.dto';
import { GetTransactionResponseDto } from './dto/get-transaction.dto';
import { PaymentGatewayType } from './config/payment.config';
import { PaymentWebhookException } from './exceptions/payment.exception';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('order')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<CreateOrderResponseDto> {
    this.logger.log('POST /payments/order');
    const result = await this.paymentsService.createOrder(
      createOrderDto.amount,
      createOrderDto.currency,
      createOrderDto.metadata || {},
    );

    return {
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
      status: result.status,
      createdAt: result.createdAt,
      metadata: result.metadata,
      redirectUrl: result.redirectUrl, // For gateways sending redirect urls
      clientSecret: result.clientSecret, // For gateways senind client-side secrets
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Body() verifyPaymentDto: VerifyPaymentDto,
  ): Promise<VerifyPaymentResponseDto> {
    this.logger.log('POST /payments/verify');
    const isValid = await this.paymentsService.verifyPayment(
      verifyPaymentDto.paymentId,
      verifyPaymentDto.signature,
    );

    return {
      success: isValid,
      paymentId: verifyPaymentDto.paymentId,
      message: isValid ? 'Payment verified successfully' : 'Payment verification failed',
    };
  }

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Body() refundPaymentDto: RefundPaymentDto,
  ): Promise<RefundPaymentResponseDto> {
    this.logger.log('POST /payments/refund');
    const result = await this.paymentsService.refundPayment(
      refundPaymentDto.paymentId,
      refundPaymentDto.amount,
    );

    return {
      refundId: result.refundId,
      paymentId: result.paymentId,
      amount: result.amount,
      status: result.status,
      createdAt: result.createdAt,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTransaction(@Param('id') id: string): Promise<GetTransactionResponseDto> {
    this.logger.log(`GET /payments/${id}`);
    const result = await this.paymentsService.getTransaction(id);

    return {
      transactionId: result.transactionId,
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
      status: result.status,
      method: result.method,
      createdAt: result.createdAt,
      metadata: result.metadata,
    };
  }

  @Get('transactions/order/:orderId')
  @HttpCode(HttpStatus.OK)
  async getOrderTransactions(@Param('orderId') orderId: string) {
    this.logger.log(`GET /payments/transactions/order/${orderId}`);
    return this.paymentsService.getOrderTransactions(orderId);
  }

  @Get('transactions/payment/:paymentId')
  @HttpCode(HttpStatus.OK)
  async getPaymentTransactions(@Param('paymentId') paymentId: string) {
    this.logger.log(`GET /payments/transactions/payment/${paymentId}`);
    return this.paymentsService.getPaymentTransactions(paymentId);
  }

  @Get('transactions/user/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserTransactions(@Param('userId') userId: string) {
    this.logger.log(`GET /payments/transactions/user/${userId}`);
    return this.paymentsService.getUserTransactions(userId);
  }

  @Post('webhook/:vendor')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('vendor') vendor: PaymentGatewayType,
    @Req() req: Request,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
    @Headers('stripe-signature') stripeSignature?: string,
    @Headers('x-payu-signature') payuSignature?: string,
  ): Promise<{ success: boolean; event: string }> {
    this.logger.log(`POST /payments/webhook/${vendor}`);

    // Get raw body (preserved by custom middleware for webhook routes)
    const rawBody = req.body;
    if (!rawBody) {
      throw new PaymentWebhookException({
        vendor,
        code: 'MISSING_RAW_BODY',
        message: 'Raw body is required for webhook signature verification',
      });
    }

    // Convert string to Buffer for signature verification
    const bodyBuffer = typeof rawBody === 'string' 
      ? Buffer.from(rawBody, 'utf8') 
      : Buffer.from(JSON.stringify(rawBody));

    // Determine signature based on vendor
    let signature: string;
    switch (vendor) {
      case 'razorpay':
        signature = razorpaySignature;
        break;
        
      default:
        throw new PaymentWebhookException({
          vendor,
          code: 'UNKNOWN_VENDOR',
          message: `Unknown payment vendor: ${vendor}`,
        });
    }

    if (!signature) {
      throw new PaymentWebhookException({
        vendor,
        code: 'MISSING_SIGNATURE',
        message: 'Webhook signature is required',
      });
    }

    try {
      const event = await this.paymentsService.handleWebhook(vendor, bodyBuffer, signature);

      this.logger.log(`Webhook processed: ${event.event} from ${vendor}`);

      // Here you can add custom business logic based on the event
      // For example: update order status, send notifications, etc.

      return {
        success: true,
        event: event.event,
      };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${vendor}`, error);
      throw new PaymentWebhookException({
        vendor,
        code: 'WEBHOOK_PROCESSING_FAILED',
        message: error.message,
        raw: error,
      });
    }
  }
}
