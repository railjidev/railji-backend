export interface OrderResult {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  metadata?: Record<string, any>;
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

  verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean>;

  getTransaction(paymentId: string): Promise<TransactionResult>;

  verifyWebhookSignature(payload: Buffer, signature: string): boolean;

  parseWebhookEvent(payload: Buffer): WebhookEvent;
}
