export type PaymentGatewayType = 'razorpay' | 'stripe' | 'payu';

export const PAYMENT_GATEWAY_TOKENS = {
  RAZORPAY: 'RAZORPAY_GATEWAY',
  STRIPE: 'STRIPE_GATEWAY',
  PAYU: 'PAYU_GATEWAY',
} as const;
