export type PaymentGatewayType = 'razorpay' | 'stripe' | 'payu';

export interface PaymentConfig {
  gateway: PaymentGatewayType;
  razorpay: {
    apiKey: string;
    keySecret: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  payu: {
    merchantKey: string;
    merchantSalt: string;
  };
}
