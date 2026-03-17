/**
 * Railji Shared Library
 * Export all shared utilities, constants, filters, interceptors and services
 */

// Filters
export { HttpExceptionFilter } from './filters/http-exception.filter';

// Interceptors
export { LoggingInterceptor } from './interceptors/logging.interceptor';
export {
  ResponseInterceptor,
  ApiResponse,
} from './interceptors/response.interceptor';
export {
  ErrorInterceptor,
  ErrorResponse,
} from './interceptors/error.interceptor';

// Services
export { LoggerServiceProvider } from './services/logger.service';
export {
  HttpClientService,
  HttpClientInterceptor,
} from './services/http-client.service';
export { CacheService } from './services/cache.service';
export { ErrorHandlerService } from './services/error-handler.service';

// Schemas
export { User, UserSchema } from './schemas/user.schema';
export { Paper, PaperSchema } from './schemas/paper.schema';
export {
  QuestionBank,
  QuestionBankSchema,
  Question,
  QuestionSchema,
  LocalizedText,
  LocalizedTextSchema,
  Option,
  OptionSchema,
  QuestionDetail,
  QuestionDetailSchema,
} from './schemas/question-bank.schema';

// Utils
export {
  buildDateFilter,
  getCurrentMonthRange,
  getLastMonthsRange,
  DateRange,
} from './utils/date.utils';
export {
  generateId,
  generateCustomId,
  generateUrlSafeId,
  generatePaperId,
  generateUserId,
  generateExamId,
  generateDepartmentId,
  generatePrefixedId,
} from './utils/uuid.utils';

// Module
export { SharedCommonModule } from './common/shared-common.module';

