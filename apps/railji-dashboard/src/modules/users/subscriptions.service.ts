import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, ErrorHandlerService } from '@railji/shared';
import { GrantAccessDto } from './dto/grant-access.dto';
import { PapersService } from '../papers/papers.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
    private errorHandler: ErrorHandlerService,
    private papersService: PapersService,
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

        // Log grant operation for department
        if (adminId) {
          await this.papersService.logPaperOperation(adminId, 'grant', {
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

        // Log grant operation for paper
        if (adminId) {
          await this.papersService.logPaperOperation(adminId, 'grant', {
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
        context: 'SubscriptionsService.grantAccess',
        userId: grantAccessDto.userId,
      });
    }
  }

  private validateGrantAccessDto(dto: GrantAccessDto): void {
    if (!dto.departmentId && !dto.paperId) {
      throw new Error('At least one department or paper must be specified');
    }
  }

  private calculateSubscriptionDates(dto: GrantAccessDto): { startDate: Date; endDate: Date } {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    return { startDate, endDate };
  }

  private async handleDepartmentAccess(
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

  private async handlePaperAccess(
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

  private async findActiveSubscription(
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

  private async appendPaperToSubscription(
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

  private async createSubscription(data: {
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

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      return await this.subscriptionModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'SubscriptionsService.getUserSubscriptions',
        userId,
      });
    }
  }

  async revokeAccess(userId: string, departmentId?: string, paperId?: string, adminId?: string): Promise<{ modifiedSubscriptions: Subscription[], message: string }> {
    try {
      if (!departmentId && !paperId) {
        throw new Error('Either departmentId or paperId must be specified for revocation');
      }

      if (departmentId && paperId) {
        throw new Error('Only one of departmentId or paperId should be specified, not both');
      }

      const modifiedSubscriptions: Subscription[] = [];

      if (departmentId) {
        // For department revocation: find and cancel the specific department subscription
        const departmentSubscriptions = await this.subscriptionModel
          .find({
            userId,
            accessType: 'department',
            departmentId,
            status: 'active',
            endDate: { $gt: new Date() },
          })
          .exec();

        for (const subscription of departmentSubscriptions) {
          subscription.status = 'cancelled';
          subscription.description = `${subscription.description} - Revoked by admin`;
          subscription.updatedAt = new Date();
          
          const savedSubscription = await subscription.save();
          modifiedSubscriptions.push(savedSubscription);
        }

        // Log revoke operation for department
        if (adminId) {
          await this.papersService.logPaperOperation(adminId, 'revoke', {
            userId,
            departmentId,
          });
        }
      }

      if (paperId) {
        // For paper revocation: find paper subscriptions and remove the specific paper
        const paperSubscriptions = await this.subscriptionModel
          .find({
            userId,
            accessType: 'paper',
            paperIds: { $in: [paperId] },
            status: 'active',
            endDate: { $gt: new Date() },
          })
          .exec();

        for (const subscription of paperSubscriptions) {
          // Remove the specific paper from the array
          subscription.paperIds = subscription.paperIds.filter(id => id !== paperId);
          
          // If no papers left, cancel the subscription
          if (subscription.paperIds.length === 0) {
            subscription.status = 'cancelled';
            subscription.description = `${subscription.description} - Cancelled (no remaining papers)`;
          } else {
            subscription.description = `Paper bundle access: ${subscription.paperIds.length} papers`;
          }
          
          subscription.updatedAt = new Date();
          const savedSubscription = await subscription.save();
          modifiedSubscriptions.push(savedSubscription);
        }

        // Log revoke operation for paper
        if (adminId) {
          await this.papersService.logPaperOperation(adminId, 'revoke', {
            userId,
            paperId,
          });
        }
      }

      const revokedItem = departmentId ? `department: ${departmentId}` : `paper: ${paperId}`;
      
      this.logger.log(`Access revoked for user ${userId} - ${revokedItem}. Modified ${modifiedSubscriptions.length} subscription(s)`);

      return {
        modifiedSubscriptions,
        message: `Successfully revoked access to ${revokedItem}. ${modifiedSubscriptions.length} subscription(s) modified.`
      };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'SubscriptionsService.revokeAccess',
        userId,
        departmentId,
        paperId,
      });
    }
  }
}