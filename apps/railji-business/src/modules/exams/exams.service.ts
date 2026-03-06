import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { groupBy, map, meanBy, sumBy, countBy } from 'lodash';
import { Exam } from './schemas/exam.schema';
import { SubmitExamDto, StartExamDto } from './dto/exam.dto';
import { PapersService } from '../papers/papers.service';
import { ErrorHandlerService } from '@railji/shared';
import { EXAM_SUBMISSION_STATUS } from '../../constants/app.constants';
import {
  DepartmentStats,
  DateRange,
  ExamQueryParams,
  ExamsByUserIdResponse,
} from './interfaces/exam.interface';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    @InjectModel(Exam.name) private examModel: Model<Exam>,
    private papersService: PapersService,
    private errorHandler: ErrorHandlerService,
  ) {}

  // Start exam session
  async startExam(startExamDto: StartExamDto): Promise<any> {
    try {
      const { userId, paperId, departmentId } = startExamDto;

      // Generate unique attempt ID
      const examId = randomUUID();

      // Create exam record with initial state
      await this.examModel.create({
        examId,
        userId,
        paperId,
        departmentId,
        responses: [],
        status: EXAM_SUBMISSION_STATUS.IN_PROGRESS,
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
  async submitExam(submitExamDto: SubmitExamDto): Promise<any> {
    try {
      const {
        examId,
        userId,
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
      const paper = await this.papersService.findById(paperId);
      if (!paper) {
        throw new NotFoundException(`Paper with ID ${paperId} not found`);
      }

      if (exam.status !== EXAM_SUBMISSION_STATUS.IN_PROGRESS) {
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
      exam.status = EXAM_SUBMISSION_STATUS.SUBMITTED;
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

      await exam.save();

      this.logger.log(
        `Exam submitted successfully. Score: ${score}/${maxScore} (${percentage.toFixed(2)}%)`,
      );

      return {
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
    } catch (error) {
      this.errorHandler.handle(error, { context: 'ExamsService.submitExam' });
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

  // Get all exams by userId
  async fetchExamsByUserId(
    userId: string,
    query?: ExamQueryParams,
  ): Promise<ExamsByUserIdResponse> {
    try {
      const { startDate, endDate } = this.getDateRange(query);
      const filter: Record<string, any> = {
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
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
        throw new NotFoundException(
          `No exams found for user ${userId} in the specified date range`,
        );
      }

      const departmentData = this.groupAndCalculateStats(exams);

      return {
        totalExams: exams.length,
        totalDepartments: departmentData.length,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        departments: departmentData,
      };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'ExamsService.fetchExamsByUserId',
      });
    }
  }

  private getDateRange(query?: ExamQueryParams): DateRange {
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const startDate = query?.startDate
      ? new Date(query.startDate)
      : defaultStartDate;
    const endDate = query?.endDate ? new Date(query.endDate) : defaultEndDate;

    // Set end date to end of day if time is not specified
    if (
      query?.endDate &&
      endDate.getHours() === 0 &&
      endDate.getMinutes() === 0
    ) {
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  private groupAndCalculateStats(exams: Exam[]): DepartmentStats[] {
    const grouped = groupBy(exams, 'departmentId') as Record<string, Exam[]>;

    return map(
      grouped,
      (deptExams: Exam[], departmentId: string): DepartmentStats => {
        const totalExams = deptExams.length;
        const statusCounts = countBy(deptExams, 'status');
        const passedCount = sumBy(deptExams, (e) => (e.isPassed ? 1 : 0));
        const failedCount = sumBy(deptExams, (e) =>
          e.status === EXAM_SUBMISSION_STATUS.SUBMITTED && !e.isPassed ? 1 : 0,
        );

        return {
          departmentId,
          totalExams,
          examSubmissionStatusCount: {
            [EXAM_SUBMISSION_STATUS.IN_PROGRESS]:
              statusCounts[EXAM_SUBMISSION_STATUS.IN_PROGRESS] || 0,
            [EXAM_SUBMISSION_STATUS.SUBMITTED]:
              statusCounts[EXAM_SUBMISSION_STATUS.SUBMITTED] || 0,
            [EXAM_SUBMISSION_STATUS.ABANDONED]:
              statusCounts[EXAM_SUBMISSION_STATUS.ABANDONED] || 0,
            [EXAM_SUBMISSION_STATUS.TIMEOUT]:
              statusCounts[EXAM_SUBMISSION_STATUS.TIMEOUT] || 0,
          },
          averageScore: (meanBy(deptExams, 'score') || 0).toFixed(2),
          averagePercentage: (meanBy(deptExams, 'percentage') || 0).toFixed(2),
          averageAccuracy: (meanBy(deptExams, 'accuracy') || 0).toFixed(2),
          totalCorrectAnswers: sumBy(deptExams, 'correctAnswers'),
          totalIncorrectAnswers: sumBy(deptExams, 'incorrectAnswers'),
          totalAttemptedQuestions: sumBy(deptExams, 'attemptedQuestions'),
          totalUnattemptedQuestions: sumBy(deptExams, 'unattemptedQuestions'),
          passedCount,
          failedCount,
          passRate:
            totalExams > 0
              ? ((passedCount / totalExams) * 100).toFixed(2)
              : '0.00',
          //exams: deptExams,
        };
      },
    );
  }
}
