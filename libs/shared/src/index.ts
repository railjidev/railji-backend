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
export { SharedUsersService } from './services/users.service';
export { SharedSubscriptionsService, AuditLogger } from './services/subscriptions.service';

// Schemas
export { User, UserSchema } from './schemas/user.schema';
export { Paper, PaperSchema } from './schemas/paper.schema';
export { Plan, PlanSchema } from './schemas/plan.schema';
export { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
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

// DTOs
export { GrantAccessDto } from './dto/grant-access.dto';

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
export {
  PaginationOptions,
  PaginationMeta,
  calculateSkip,
  pagination,
  paginate,
} from './utils/pagination.utils';
export {
  filterNullValues,
  ensureCleanArray,
  cleanObjectArrays,
  safeArrayPush,
  isEmptyString,
  safeTrim,
  removeNullValues,
  deepClone,
  isDefined,
  isValidNumber,
  safeISOString,
} from './utils/common.utils';

// Auth
export * from './auth';

// Middleware
export { JwtAuthMiddleware } from './middleware/jwt-auth.middleware';

// Guards
export { RolesGuard, IOwnershipService } from './guards/roles.guard';

// Decorators
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export {
  RequireOwnership,
  OWNERSHIP_KEY,
} from './decorators/ownership.decorator';

// Module
export { SharedCommonModule } from './common/shared-common.module';

