import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, ErrorHandlerService, SharedSubscriptionsService } from '@railji/shared';
import { PapersService } from '../papers/papers.service';

@Injectable()
export class SubscriptionsService extends SharedSubscriptionsService {
  private readonly localLogger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name) subscriptionModel: Model<Subscription>,
    errorHandler: ErrorHandlerService,
    private papersService: PapersService,
  ) {
    super(subscriptionModel, errorHandler, papersService);
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

        if (adminId) {
          await this.papersService.logPaperOperation(adminId, 'revoke', {
            userId,
            departmentId,
          });
        }
      }

      if (paperId) {
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
          subscription.paperIds = subscription.paperIds.filter(id => id !== paperId);
          
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

        if (adminId) {
          await this.papersService.logPaperOperation(adminId, 'revoke', {
            userId,
            paperId,
          });
        }
      }

      const revokedItem = departmentId ? `department: ${departmentId}` : `paper: ${paperId}`;
      
      this.localLogger.log(`Access revoked for user ${userId} - ${revokedItem}. Modified ${modifiedSubscriptions.length} subscription(s)`);

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
