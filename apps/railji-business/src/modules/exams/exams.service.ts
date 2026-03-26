import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { groupBy, map, meanBy, sumBy, countBy } from 'lodash';
import { Exam } from './schemas/exam.schema';
import {
  SubmitExamDto,
  StartExamDto,
  GetExamHistoryDto,
  GetExamStatsDto,
} from './dto/exam.dto';
import { PapersService } from '../papers/papers.service';
import { ErrorHandlerService, buildDateFilter, IOwnershipService } from '@railji/shared';
import { calculateSkip, pagination } from '@railji/shared';
import { EXAM_STATUS } from '../../constants/app.constants';
import { ExamStats } from './interfaces/exam.interface';

@Injectable()
export class ExamsService implements IOwnershipService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    @InjectModel(Exam.name) private examModel: Model<Exam>,
    private papersService: PapersService,
    private errorHandler: ErrorHandlerService,
  ) {}

  // Start exam session
  async startExam(startExamDto: StartExamDto, userId: string): Promise<any> {
    try {
      const { paperId, departmentId, examMode } = startExamDto;

      // Generate unique attempt ID
      const examId = randomUUID();

      // Create exam record with initial state
      await this.examModel.create({
        examId,
        userId,
        paperId,
        departmentId,
        examMode,
        responses: [],
        status: EXAM_STATUS.IN_PROGRESS,
        startTime: new Date(),
        deviceInfo: {
          device: 'Unknown',
          ipAddress: 'Unknown',
          userAgent: 'Unknown',
        },
      });

      return { examId };
    } catch (error) {
      this.errorHandler.handle(error, { context: 'ExamsService.startExam' });
    }
  }

  // Submit exam answers
  async submitExam(submitExamDto: SubmitExamDto, userId: string): Promise<any> {
    try {
      const {
        examId,
        paperId,
        departmentId,
        responses,
        attemptedQuestions = 0,
        unattemptedQuestions = 0,
        remarks,
      } = submitExamDto;

      // Find existing exam attempt
      const exam = await this.examModel.findOne({ examId, userId }).exec();
      if (!exam) {
        throw new NotFoundException(
          `Exam attempt with ID ${examId} for ${userId} not found`,
        );
      }

      // Fetch paper
      const paper = await this.papersService.findByPaperId(paperId);
      if (!paper) {
        throw new NotFoundException(`Paper with ID ${paperId} not found`);
      }

      if (exam.status !== EXAM_STATUS.IN_PROGRESS) {
        throw new BadRequestException(
          `Exam ${examId} is already ${exam.status}`,
        );
      }

      // Extract scoring parameters from paper schema
      const maxScore = paper.totalQuestions; // Assuming 1 mark per question
      const passPercentage = paper.passPercentage;
      const negativeMarkingPenalty = paper.negativeMarking; // Penalty per wrong answer

      // Fetch correct answers from papers service
      const answersData =
        await this.papersService.fetchAnswersForDepartmentPaper(
          departmentId,
          paperId,
        );

      if (!answersData) {
        throw new NotFoundException(`No answers found for paper ${paperId}`);
      }

      // Build a map of correct answers
      const correctAnswersMap = new Map();
      answersData.answers.forEach((answer: any) => {
        correctAnswersMap.set(answer.id, answer.correct);
      });

      // Evaluate responses
      let correctAnswers = 0;
      responses.forEach((response) => {
        const correctAnswer = correctAnswersMap.get(response.questionId);
        if (
          correctAnswer !== undefined &&
          response.selectedOption === correctAnswer
        ) {
          correctAnswers++;
        }
      });

      const incorrectAnswers = attemptedQuestions - correctAnswers;

      // Calculate score with negative marking
      const positiveMarks = correctAnswers * 1; // 1 mark per correct answer
      const negativeMarks = incorrectAnswers * negativeMarkingPenalty;
      const score = Math.max(0, positiveMarks - negativeMarks); // Ensure score doesn't go below 0

      const percentage = (score / maxScore) * 100;
      const accuracy =
        attemptedQuestions > 0
          ? (correctAnswers / attemptedQuestions) * 100
          : 0;
      const isPassed = percentage >= passPercentage;

      // Update exam record
      exam.paperName = paper.name;
      exam.paperCode = paper.paperCode;
      exam.paperType = paper.paperType;
      exam.responses = responses;
      exam.totalQuestions = paper.totalQuestions;
      exam.attemptedQuestions = attemptedQuestions;
      exam.unattemptedQuestions = unattemptedQuestions;
      exam.correctAnswers = correctAnswers;
      exam.incorrectAnswers = incorrectAnswers;
      exam.score = score;
      exam.maxScore = maxScore;
      exam.passPercentage = passPercentage;
      exam.percentage = percentage;
      exam.accuracy = accuracy;
      exam.endTime = new Date();
      exam.status = EXAM_STATUS.SUBMITTED;
      exam.isPassed = isPassed;
      exam.remarks = remarks;

      // Calculate time taken in hours, minutes and seconds
      const timeTakenInSeconds = Math.floor(
        (exam.endTime.getTime() - exam.startTime.getTime()) / 1000,
      );
      const hours = Math.floor(timeTakenInSeconds / 3600);
      const minutes = Math.floor((timeTakenInSeconds % 3600) / 60);
      const seconds = timeTakenInSeconds % 60;

      exam.timeTaken = {
        hours,
        minutes,
        seconds,
      };

      // Prepare response data
      const responseData = {
        examId,
        score,
        maxScore,
        passPercentage,
        percentage: percentage.toFixed(2),
        accuracy: accuracy.toFixed(2),
        isPassed,
        correctAnswers,
        incorrectAnswers,
        totalQuestions: paper.totalQuestions,
        attemptedQuestions,
        unattemptedQuestions,
        negativeMarking: negativeMarkingPenalty,
        submittedAt: exam.endTime,
      };
      
      await exam.save();

      // Handle exam mode logic
      /* if (exam.examMode === 'live') {
        // Save exam data for live exams
        await exam.save();
        this.logger.log(
          `Live exam submitted successfully. Score: ${score}/${maxScore} (${percentage.toFixed(2)}%)`,
        );
      } else if (exam.examMode === 'mock') {
        // Delete exam document for mock exams after preparing response
        await this.examModel.deleteOne({ examId, userId }).exec();
        this.logger.log(
          `Mock exam submitted and deleted successfully. Score: ${score}/${maxScore} (${percentage.toFixed(2)}%)`,
        );
      } */

      return responseData;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'ExamsService.submitExam' });
    }
  }

  // Verify exam ownership (implements IOwnershipService)
  async verifyOwnership(examId: string, userId: string): Promise<void> {
    const exam = await this.examModel.findOne({ examId }).exec();

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    // Convert to string for comparison (in case userId is stored as ObjectId)
    if (exam.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have access to this exam');
    }
  }

  // Get exam by examId
  async fetchExamByExamId(examId: string): Promise<any> {
    try {
      const exam = await this.examModel.findOne({ examId }).exec();

      if (!exam) {
        throw new NotFoundException(`Exam with ID ${examId} not found`);
      }

      return exam;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'ExamsService.fetchExamByExamId',
      });
    }
  }

  // Get exam stats by userId
  async fetchExamStatsForUserId(
    userId: string,
    query?: GetExamStatsDto,
  ): Promise<any> {
    try {
      const dateFilter = buildDateFilter(query.startDate, query.endDate);
      const filter: Record<string, any> = {
        userId,
        examMode: 'live',
        ...dateFilter,
      };

      /* if (query.departmentId) {
      filter.departmentId = query.departmentId;
    } */

      // Fetch exams without responses field
      const exams = await this.examModel
        .find(filter)
        .select('-responses')
        .sort({ createdAt: -1 })
        .exec();

      if (!exams || exams.length === 0) {
        throw new NotFoundException(`No exams found for user ${userId}`);
      }

      // Separate exams by paper type
      const generalExams = exams.filter(exam => exam.paperType === 'general');
      const nonGeneralExams = exams.filter(exam => exam.paperType === 'full' || exam.paperType === 'sectional');

      const departmentstats = this.departmentStats(nonGeneralExams);
      
      const result: any = {
        totalExams: exams.length,
        totalDepartments: departmentstats.length,
        departmentExams: departmentstats,
      };

      // Add paperCodeStats at root level for general paper type
      if (generalExams.length > 0) {
        result.generalExams = this.paperCodeStats(generalExams);
      }

      return result;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'ExamsService.fetchExamsByUserId',
      });
    }
  }

  private departmentStats(exams: Exam[]): ExamStats[] {
    return map(groupBy(exams, 'departmentId'), (deptExams, departmentId) => {
      const stats: any = {
        departmentId,
        ...this.calculateStats(deptExams),
      };

      // Only add paperCodeStats for full or sectional paper types
      const nonGeneralExams = deptExams.filter(exam => 
        exam.paperType === 'full' || exam.paperType === 'sectional'
      );
      
      if (nonGeneralExams.length > 0) {
        stats.paperCodeStats = this.paperCodeStats(nonGeneralExams);
      }

      return stats;
    });
  }

  private paperCodeStats(exams: Exam[]): ExamStats[] {
    return map(groupBy(exams, 'paperCode'), (paperExams, paperCode) => ({
      paperCode: paperCode === 'undefined' ? 'NA' : paperCode,
      ...this.calculateStats(paperExams),
    }));
  }

  private calculateStats(exams: Exam[]) {
    const totalExams = exams.length;
    const statusCounts = countBy(exams, 'status');
    const passedCount = sumBy(exams, (e) => (e.isPassed ? 1 : 0));
    const failedCount = sumBy(exams, (e) =>
      e.status === EXAM_STATUS.SUBMITTED && !e.isPassed ? 1 : 0,
    );

    return {
      totalExams,
      statusCount: {
        [EXAM_STATUS.IN_PROGRESS]: statusCounts[EXAM_STATUS.IN_PROGRESS] || 0,
        [EXAM_STATUS.SUBMITTED]: statusCounts[EXAM_STATUS.SUBMITTED] || 0,
        [EXAM_STATUS.TIMEOUT]: statusCounts[EXAM_STATUS.TIMEOUT] || 0,
      },
      averageScore: (meanBy(exams, 'score') || 0).toFixed(2),
      averagePercentage: (meanBy(exams, 'percentage') || 0).toFixed(2),
      averageAccuracy: (meanBy(exams, 'accuracy') || 0).toFixed(2),
      totalCorrectAnswers: sumBy(exams, 'correctAnswers'),
      totalIncorrectAnswers: sumBy(exams, 'incorrectAnswers'),
      totalAttemptedQuestions: sumBy(exams, 'attemptedQuestions'),
      totalUnattemptedQuestions: sumBy(exams, 'unattemptedQuestions'),
      totalTimeTaken: {
        hours: sumBy(exams, (e) => e.timeTaken?.hours || 0),
        minutes: sumBy(exams, (e) => e.timeTaken?.minutes || 0),
        seconds: sumBy(exams, (e) => e.timeTaken?.seconds || 0),
      },
      passedCount,
      failedCount,
      passRate:
        totalExams > 0 ? ((passedCount / totalExams) * 100).toFixed(2) : '0.00',
    };
  }

  async fetchExamHistoryForUserId(
    userId: string,
    page: number,
    limit: number,
    query: GetExamHistoryDto = {},
  ): Promise<any> {
    try {
      const dateFilter = buildDateFilter(query.startDate, query.endDate);
      const filter: Record<string, any> = {
        userId,
        ...dateFilter,
      };

      //Todo: Add filters if needed
      const { page: _, limit: __ } = query || {};
      const skip = calculateSkip(page, limit);

      const [exams, total] = await Promise.all([
        this.examModel
          .find(filter)
          .select('-responses')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.examModel.countDocuments(filter).exec(),
      ]);

      if (!exams || exams.length === 0) {
        throw new NotFoundException(`No exams found for user ${userId}`);
      }

      return {
        exams,
        ...pagination(page, limit, total),
        filter
      };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'ExamsService.fetchExamHistoryForUserId',
      });
    }
  }
}
