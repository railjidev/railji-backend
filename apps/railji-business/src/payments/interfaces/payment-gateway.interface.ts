export interface OrderResult {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  metadata?: Record<string, any>;
  // For redirect-based gateways (PayU, some Stripe flows)
  redirectUrl?: string;
  // For client-side integration (Razorpay, Stripe)
  clientSecret?: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  status: string;
  createdAt: Date;
}

export interface TransactionResult {
  transactionId: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  event: string;
  vendor: string;
  paymentId?: string;
  orderId?: string;
  status?: string;
  amount?: number;
  data: Record<string, any>;
}

export interface IPaymentGateway {
  createOrder(
    amount: number,
    currency: string,
    metadata: Record<string, any>,
  ): Promise<OrderResult>;

  verifyPayment(paymentId: string, signature: string): Promise<boolean>;

  refund(paymentId: string, amount?: number): Promise<RefundResult>;

  getTransaction(paymentId: string): Promise<TransactionResult>;

  verifyWebhookSignature(payload: Buffer, signature: string): boolean;

  parseWebhookEvent(payload: Buffer): WebhookEvent;
}
