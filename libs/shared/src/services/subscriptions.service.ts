import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription } from '../schemas/subscription.schema';
import { ErrorHandlerService } from './error-handler.service';
import { GrantAccessDto } from '../dto/grant-access.dto';

export interface AuditLogger {
  logPaperOperation(
    adminId: string,
    action: 'grant' | 'revoke',
    metadata: { userId: string; departmentId?: string; paperId?: string }
  ): Promise<void>;
}

@Injectable()
export class SharedSubscriptionsService {
  protected readonly logger = new Logger(SharedSubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name)
    protected subscriptionModel: Model<Subscription>,
    protected errorHandler: ErrorHandlerService,
    @Optional() @Inject('AUDIT_LOGGER') protected auditLogger?: AuditLogger,
  ) {}

  async grantAccess(grantAccessDto: GrantAccessDto, adminId?: string): Promise<Subscription[]> {
    try {
      this.validateGrantAccessDto(grantAccessDto);

      const { userId, departmentId, paperId } = grantAccessDto;
      const { startDate, endDate } = this.calculateSubscriptionDates(grantAccessDto);
      const subscriptions: Subscription[] = [];

      if (departmentId) {
        const departmentSub = await this.handleDepartmentAccess(
          userId,
          departmentId,
          startDate,
          endDate,
          grantAccessDto
        );
        subscriptions.push(departmentSub);

        if (adminId && this.auditLogger) {
          await this.auditLogger.logPaperOperation(adminId, 'grant', {
            userId,
            departmentId,
          });
        }
      }

      if (paperId) {
        const paperSub = await this.handlePaperAccess(
          userId,
          paperId,
          startDate,
          endDate,
          grantAccessDto
        );
        subscriptions.push(paperSub);

        if (adminId && this.auditLogger) {
          await this.auditLogger.logPaperOperation(adminId, 'grant', {
            userId,
            paperId,
          });
        }
      }

      this.logger.log(
        `Access granted to user ${userId}: ${departmentId ? '1 department' : '0 departments'}, ${paperId ? '1 paper' : '0 papers'}`
      );

      return subscriptions;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'SharedSubscriptionsService.grantAccess',
        userId: grantAccessDto.userId,
      });
    }
  }

  protected validateGrantAccessDto(dto: GrantAccessDto): void {
    if (!dto.departmentId && !dto.paperId) {
      throw new Error('At least one department or paper must be specified');
    }
  }

  protected calculateSubscriptionDates(dto: GrantAccessDto): { startDate: Date; endDate: Date } {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    return { startDate, endDate };
  }

  protected async handleDepartmentAccess(
    userId: string,
    departmentId: string,
    startDate: Date,
    endDate: Date,
    dto: GrantAccessDto
  ): Promise<Subscription> {
    const existing = await this.findActiveSubscription(userId, 'department', departmentId);

    if (existing) {
      this.logger.warn(`User ${userId} already has active subscription for department ${departmentId}`);
      return existing;
    }

    return this.createSubscription({
      userId,
      accessType: 'department',
      departmentId,
      startDate,
      endDate,
      description: dto.description || `Department access: ${departmentId}`,
      paymentRef: dto.paymentRef,
      paymentGateway: dto.paymentGateway,
    });
  }

  protected async handlePaperAccess(
    userId: string,
    paperId: string,
    startDate: Date,
    endDate: Date,
    dto: GrantAccessDto
  ): Promise<Subscription> {
    const existing = await this.findActiveSubscription(userId, 'paper');

    if (existing) {
      return this.appendPaperToSubscription(existing, paperId, userId, dto.description);
    }

    return this.createSubscription({
      userId,
      accessType: 'paper',
      paperIds: [paperId],
      startDate,
      endDate,
      description: dto.description || `Paper access: ${paperId}`,
      paymentRef: dto.paymentRef,
      paymentGateway: dto.paymentGateway,
    });
  }

  protected async findActiveSubscription(
    userId: string,
    accessType: string,
    departmentId?: string
  ): Promise<Subscription | null> {
    const query: any = {
      userId,
      accessType,
      status: 'active',
      endDate: { $gt: new Date() },
    };

    if (departmentId) {
      query.departmentId = departmentId;
    }

    return this.subscriptionModel.findOne(query).exec();
  }

  protected async appendPaperToSubscription(
    subscription: Subscription,
    paperId: string,
    userId: string,
    description?: string
  ): Promise<Subscription> {
    if (subscription.paperIds.includes(paperId)) {
      this.logger.warn(`User ${userId} already has paper ${paperId}`);
      return subscription;
    }

    subscription.paperIds.push(paperId);
    subscription.description =
      description || `Paper bundle access: ${subscription.paperIds.length} papers`;

    this.logger.log(`Appended paper ${paperId} for user ${userId}`);
    return subscription.save();
  }

  protected async createSubscription(data: {
    userId: string;
    accessType: string;
    startDate: Date;
    endDate: Date;
    description: string;
    paymentRef?: string;
    paymentGateway?: string;
    departmentId?: string;
    paperIds?: string[];
  }): Promise<Subscription> {
    const subscription = new this.subscriptionModel({
      ...data,
      status: 'active',
    });

    return subscription.save();
  }
}
