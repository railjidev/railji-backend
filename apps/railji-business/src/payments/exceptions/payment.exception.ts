import { HttpException, HttpStatus } from '@nestjs/common';

export interface PaymentErrorDetails {
  vendor: string;
  code: string;
  message: string;
  raw?: any;
}

export class PaymentException extends HttpException {
  constructor(
    public readonly details: PaymentErrorDetails,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode: status,
        error: 'PaymentError',
        ...details,
      },
      status,
    );
  }
}

export class PaymentOrderCreationException extends PaymentException {
  constructor(details: PaymentErrorDetails) {
    super(details, HttpStatus.BAD_REQUEST);
  }
}

export class PaymentVerificationException extends PaymentException {
  constructor(details: PaymentErrorDetails) {
    super(details, HttpStatus.UNAUTHORIZED);
  }
}

export class PaymentRefundException extends PaymentException {
  constructor(details: PaymentErrorDetails) {
    super(details, HttpStatus.BAD_REQUEST);
  }
}

export class PaymentNotFoundException extends PaymentException {
  constructor(details: PaymentErrorDetails) {
    super(details, HttpStatus.NOT_FOUND);
  }
}

export class PaymentWebhookException extends PaymentException {
  constructor(details: PaymentErrorDetails) {
    super(details, HttpStatus.BAD_REQUEST);
  }
}

export class PaymentGatewayNotConfiguredException extends PaymentException {
  constructor(vendor: string) {
    super(
      {
        vendor,
        code: 'GATEWAY_NOT_CONFIGURED',
        message: `Payment gateway ${vendor} is not properly configured`,
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
