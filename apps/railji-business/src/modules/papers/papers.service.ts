import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Paper, QuestionBank } from '@railji/shared';
import { CacheService, ErrorHandlerService } from '@railji/shared';
import { calculateSkip, pagination, cleanObjectArrays, ensureCleanArray } from '@railji/shared';
import { FetchPapersQueryDto } from './dto/paper.dto';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface PaperCodesByType {
  general: string[];
  nonGeneral: string[];
}

@Injectable()
export class PapersService {
  private readonly logger = new Logger(PapersService.name);
  private readonly PAPER_CODES_PREFIX = 'paper_codes';
  private readonly TOP_PAPERS_CACHE_KEY = 'top_papers';
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectModel(Paper.name) private paperModel: Model<Paper>,
    @InjectModel(QuestionBank.name)
    private questionBankModel: Model<QuestionBank>,
    private readonly cacheService: CacheService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  private generateCacheKey(departmentId: string, filters?: any): string {
    const filtersStr = filters ? JSON.stringify(filters) : '{}';
    return `${this.PAPER_CODES_PREFIX}:${departmentId}:${filtersStr}`;
  }

  clearAllCache(): void {
    this.cacheService.clear();
    this.logger.debug('Cleared all paper codes cache and top papers cache');
  }

  async designationsForDepartment(departmentId: string): Promise<string[]> {
    try {
      const cacheKey = `designations:${departmentId}`;

      // Check cache first
      const cached = this.cacheService.get<string[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Returning cached designations for department: ${departmentId}`);
        return cached;
      }

      // Fetch distinct designations for the department
      const designations = await this.paperModel
        .distinct('designation', {
          $or: [
            { paperType: 'general' },
            { departmentId, paperType: { $ne: 'general' } },
          ],
        })
        .exec();

      // Clean and sort designations
      const cleanedDesignations = ensureCleanArray(designations.filter((p): p is string => typeof p === 'string')).sort();

      // Cache the results
      this.cacheService.set(cacheKey, cleanedDesignations, this.DEFAULT_TTL);
      this.logger.debug(`Cached ${cleanedDesignations.length} designations for department: ${departmentId}`);

      return cleanedDesignations;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.designationsForDepartment',
      });
    }
  }

  async findAll(query?: any): Promise<Paper[]> {
    try {
      const papers = await this.paperModel.find(query || {}).exec();
      return papers;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'PapersService.findAll' });
    }
  }

  async getTopPapers(): Promise<Paper[]> {
    try {
      // Check cache first
      const cached = this.cacheService.get<Paper[]>(this.TOP_PAPERS_CACHE_KEY);

      if (cached) {
        this.logger.debug('Returning cached top papers');
        return cached;
      }

      // Fetch from database
      const papers = await this.paperModel.find().limit(6).exec();

      // Cache the result
      this.cacheService.set(
        this.TOP_PAPERS_CACHE_KEY,
        papers,
        this.DEFAULT_TTL,
      );
      this.logger.debug(`Cached ${papers.length} top papers`);

      return papers;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.getTopPapers',
      });
    }
  }

  async findByPaperId(paperId: string): Promise<Paper> {
    try {
      const paper = await this.paperModel.findOne({ paperId }).exec();
      if (!paper) {
        throw new NotFoundException(`Paper with ID ${paperId} not found`);
      }
      return paper;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'papersService.findByPaperId' });
    }
  }

  async paperCodesForDepartmentAndDesignation(
    departmentId: string,
    designations?: string,
  ): Promise<PaperCodesByType> {
    try {
      const cacheKey = this.generateCacheKey(departmentId, { designations });

      // Check if paper codes are already cached
      /* const cached = this.cacheService.get<PaperCodesByType>(cacheKey);
      if (cached) {
        this.logger.debug(
          `Returning cached paper codes for department: ${departmentId}, designations: ${designations}`,
        );
        return cached;
      } */

      // Build match conditions
      const matchConditions: any = {
        $or: [
          // General papers from entire collection (no department filter, no designation filter)
          {
            paperType: 'general',
          },
          // Non-general papers from specific department only
          {
            departmentId,
            paperType: { $ne: 'general' },
            ...(designations && { designation: designations }),
          },
        ],
      };

      // Single aggregation with conditional logic for general vs non-general papers
      const result = await this.paperModel
        .aggregate([
          {
            $match: matchConditions,
          },
          {
            $group: {
              _id: {
                paperCode: '$paperCode',
                paperType: '$paperType',
              },
            },
          },
          {
            $group: {
              _id: {
                $cond: {
                  if: { $eq: ['$_id.paperType', 'general'] },
                  then: 'general',
                  else: 'nonGeneral',
                },
              },
              paperCodes: { $addToSet: '$_id.paperCode' },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id',
              paperCodes: { $sortArray: { input: '$paperCodes', sortBy: 1 } },
            },
          },
        ])
        .exec();

      // Process results
      const paperCodesByType: PaperCodesByType = {
        general: [],
        nonGeneral: [],
      };

      result.forEach((item: { type: string; paperCodes: string[] }) => {
        if (item.type === 'general') {
          paperCodesByType.general = ensureCleanArray(item.paperCodes);
        } else {
          paperCodesByType.nonGeneral = ensureCleanArray(item.paperCodes);
        }
      });

      // Clean the results to ensure no null values
      const cleanedPaperCodes = cleanObjectArrays(paperCodesByType);

      // Cache the results
      this.cacheService.set(cacheKey, cleanedPaperCodes, this.DEFAULT_TTL);
      this.logger.debug(
        `Cached ${cleanedPaperCodes.general.length} general and ${cleanedPaperCodes.nonGeneral.length} non-general paper codes for department: ${departmentId}${designations ? `, designations: ${designations}` : ''}`,
      );

      return cleanedPaperCodes;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.paperCodesForDepartmentAndDesignation',
      });
    }
  }

  async fetchPapersForDepartment(
    departmentId: string,
    page: number = 1,
    limit: number = 10,
    query?: FetchPapersQueryDto,
    userId?: string,
  ): Promise<{
    designations: string[];
    paperCodes: PaperCodesByType;
    papers: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = calculateSkip(page, limit);

      // Build the query with departmentId and any additional filters
      const { page: _, limit: __, sortBy, sortOrder, ...filterQuery } = query || {};
      
      // Special handling for general papers
      let searchQuery: any;
      if (query?.paperType === 'general') {
        // For general papers, only filter by paperCode if provided
        searchQuery = {
          paperType: 'general',
          ...(query?.paperCode && { paperCode: query.paperCode }),
        };
      } else {
        // For non-general papers, apply department and designation filters
        searchQuery = {
          ...filterQuery,
          $or: [
            // General papers (always included, filtered by paperCode if provided)
            {
              paperType: 'general',
              ...(query?.paperCode && { paperCode: query.paperCode }),
            },
            // Non-general papers from specific department
            {
              departmentId,
              paperType: { $ne: 'general' },
              ...(query?.designation && { designation: { $in: [query.designation] } }),
              ...(query?.paperCode && { paperCode: query.paperCode }),
              ...(query?.year && { year: query.year }),
            },
          ],
        };
      }

      // Fetch designations and paper codes in parallel
      const [designations, paperCodes] = await Promise.all([
        this.designationsForDepartment(departmentId),
        this.paperCodesForDepartmentAndDesignation(departmentId, query?.designation),
      ]);

      // Build sort options
      const sortOptions: any = {};
      if (sortBy) {
        const sortOrderValue = sortOrder === 'desc' ? -1 : 1;
        switch (sortBy) {
          case 'name':
            sortOptions.name = sortOrderValue;
            sortOptions.createdAt = sortOrderValue; // Secondary sort for same names
            break;
          case 'rating':
            sortOptions.rating = sortOrderValue;
            sortOptions.createdAt = -1; // Secondary sort by newest
            break;
          case 'updatedAt':
            sortOptions.updatedAt = sortOrderValue;
            break;
        }
      } else {
        // Default sort by updatedAt descending for consistent ordering
        sortOptions.updatedAt = -1;
      }

      // Fetch paginated papers and total count
      const [papers, total] = await Promise.all([
        this.paperModel
          .find(searchQuery)
          .collation({ locale: 'en', strength: 2 }) // Case-insensitive sorting
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.paperModel.countDocuments(searchQuery).exec(),
      ]);

      // userId is already provided as parameter
      // Add hasAccess field to each paper
      const papersWithAccess = await Promise.all(
        papers.map(async (paper) => {
          let hasAccess = false;

          // If paper is free, user has access
          if (paper.isFree === true) {
            hasAccess = true;
          } else if (userId) {
            // Check if user has access to this paper (either paper-level or department-level subscription)
            hasAccess = await this.subscriptionsService.hasAccessToPaper(
              userId,
              paper.paperId,
              paper.departmentId,
            );
          }

          return {
            ...paper.toObject(),
            hasAccess,
          };
        })
      );

      return {
        designations,
        paperCodes,
        papers: papersWithAccess,
        ...pagination(page, limit, total),
      };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.fetchPapersForDepartment',
      });
    }
  }

  async fetchQuestionsForDepartmentPaper(
    departmentId: string,
    paperId: string,
  ) {
    try {
      const result = await this.questionBankModel
        .aggregate([
          {
            $match: { paperId },
          },
          {
            $lookup: {
              from: 'papers',
              localField: 'paperId',
              foreignField: 'paperId',
              as: 'paperDetails',
            },
          },
          {
            $unwind: {
              path: '$paperDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              'questions.correct': 0,
            },
          },
        ])
        .exec();

      if (!result || result.length === 0) {
        throw new NotFoundException(`Questions not found for paper ${paperId}`);
      }

      return result[0];
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.fetchQuestionsForDepartmentPaper',
      });
    }
  }

  async fetchAnswersForDepartmentPaper(departmentId: string, paperId: string) {
    try {
      const answers = await this.questionBankModel
        .aggregate([
          {
            $match: { paperId },
          },
          {
            $project: {
              answers: {
                $map: {
                  input: '$questions',
                  as: 'question',
                  in: {
                    id: '$$question.id',
                    correct: '$$question.correct',
                  },
                },
              },
            },
          },
        ])
        .exec();
      if (!answers || answers.length === 0) {
        throw new NotFoundException(`Answers not found for paper ${paperId}`);
      }
      return answers[0];
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.fetchAnswersForDepartmentPaper',
      });
    }
  }

  async fetchQuestionForPaper(
    paperId: string,
    questionId: string,
  ): Promise<Paper[]> {
    try {
      const papers = await this.paperModel.find({ paperId, questionId }).exec();
      if (!papers || papers.length === 0) {
        throw new NotFoundException(
          `Question ${questionId} not found for paper ${paperId}`,
        );
      }
      return papers;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'PapersService.fetchQuestionForPaper',
      });
    }
  }
}
