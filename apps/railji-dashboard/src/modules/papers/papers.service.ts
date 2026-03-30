import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Paper, QuestionBank, buildDateFilter, User, generatePaperId } from '@railji/shared';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { ErrorHandlerService } from '@railji/shared';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class PapersService {
  private readonly logger = new Logger(PapersService.name);

  constructor(
    @InjectModel(Paper.name) private paperModel: Model<Paper>,
    @InjectModel(QuestionBank.name)
    private questionBankModel: Model<QuestionBank>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    @InjectModel(User.name) private userModel: Model<User>,
    private errorHandler: ErrorHandlerService,
  ) {}

  async createPaper(createPaperDto: CreatePaperDto, adminId?: string): Promise<any> {
    try {
      const paperId = generatePaperId();

      // Extract questions and username from DTO
      const { questions, username, ...paperData } = createPaperDto;

      const promises = [
        this.paperModel.create({
          paperId,
          ...paperData,
          ...(username && { createdBy: username }),
        }),
        this.questionBankModel.create({
          departmentId: createPaperDto.departmentId,
          paperId,
          ...(createPaperDto.paperCode && {
            paperCode: createPaperDto.paperCode,
          }),
          questions,
        }),
      ];
      await Promise.all(promises);

      if (adminId) {
        this.logPaperOperation(adminId, 'create', { paperId });
      }
      this.logger.log(`${paperId} created successfully`);
      return { paperId };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.createPaper',
      });
    }
  }

  async updatePaper(
    paperId: string,
    updatePaperDto: UpdatePaperDto,
    adminId?: string,
  ): Promise<any> {
    try {
      const { questions, username, ...paperData } = updatePaperDto;

      // Prepare paper update data with updatedBy field
      const paperUpdateData = {
        ...paperData,
        ...(username && { updatedBy: username }),
      };

      // Always make exactly 2 parallel calls - one for paper, one for questions
      await Promise.all([
        Object.keys(paperUpdateData).length > 0
          ? this.paperModel
              .findOneAndUpdate({ paperId }, paperUpdateData)
              .exec()
          : Promise.resolve(),
        questions
          ? this.questionBankModel
              .findOneAndUpdate({ paperId }, { questions })
              .exec()
          : Promise.resolve(),
      ]);

      if (adminId) {
        this.logPaperOperation(adminId, 'update', { paperId });
      }
      this.logger.log(`${paperId} updated successfully`);
      return { paperId };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.updatePaper',
      });
    }
  }

  async deletePaper(paperId: string, adminId?: string): Promise<void> {
    try {
      const promises = [
        this.paperModel.deleteOne({ paperId }).exec(),
        this.questionBankModel.deleteOne({ paperId }).exec(),
      ];

      await Promise.all(promises);
      if (adminId) {
        this.logPaperOperation(adminId, 'delete', { paperId });
      }
      this.logger.log(`${paperId} deleted successfully`);
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.deletePaper',
      });
    }
  }

  async logPaperOperation(
    adminId: string,
    action: 'create' | 'update' | 'delete' | 'grant' | 'revoke',
    metadata: {
      paperId?: string;
      departmentId?: string;
      userId?: string;
    },
  ): Promise<void> {
    try {
      let message = `Admin ${adminId} has ${action}d`;
      
      if (metadata.paperId) {
        message += ` paper ${metadata.paperId}`;
      }
      if (metadata.departmentId) {
        message += ` for department ${metadata.departmentId}`;
      }
      if (metadata.userId) {
        message += ` for user ${metadata.userId}`;
      }

      await this.auditLogModel.create({
        adminId,
        action,
        metadata,
        message,
      });

      this.logger.log(`Audit log created: ${message}`);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
    }
  }

  async getDashboardStats(startDate?: string, endDate?: string): Promise<any> {
    try {
      const dateFilter = buildDateFilter(startDate, endDate);

      const [recentActivity, _paperUploadCount, totalPapers, totalUsers] =
        await Promise.all([
          this.auditLogModel
            .find(dateFilter)
            .sort({ createdAt: -1 })
            .lean()
            .exec(),
          this.paperModel.aggregate([
            {
              $group: {
                _id: '$createdBy',
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
          ]),
          this.paperModel.countDocuments().exec(),
          this.userModel.countDocuments().exec(),
        ]);

      // Transform _paperUploadCount to {username: count} format
      const paperUploadCount = _paperUploadCount.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      return {
        recentActivity,
        paperUploadCount,
        totalPapers,
        totalUsers,
      };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.getDashboardStats',
      });
    }
  }
}
