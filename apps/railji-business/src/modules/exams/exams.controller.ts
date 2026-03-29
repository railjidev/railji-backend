import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { SubmitExamDto, StartExamDto, GetExamStatsDto } from './dto/exam.dto';
import { paginate, RequireOwnership } from '@railji/shared';
import { UsersService } from '../users/users.service';


@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly usersService: UsersService,
  ) {}

  // POST /exams/start - Start exam session
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startExam(@Body() startExamDto: StartExamDto, @Req() req: any) {
    const user = await this.usersService.getUserFromRequest(req);
    
    const result = await this.examsService.startExam(startExamDto, user.userId);
    return {
      message: 'Exam session started successfully',
      data: result,
    };
  }

  // POST /exams/submit - Submit exam answers
  @RequireOwnership('examId', 'body')
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submitExam(@Body() submitExamDto: SubmitExamDto, @Req() req: any) {
    const user = await this.usersService.getUserFromRequest(req);
    
    const result = await this.examsService.submitExam(submitExamDto, user.userId);
    return {
      message: 'Exam submitted successfully',
      data: result,
    };
  }

  // GET /result/:examId - Fetch exam by examId
  @RequireOwnership('examId', 'param')
  @Get('result/:examId')
  @HttpCode(HttpStatus.OK)
  async getExam(@Param('examId') examId: string) {
    const result = await this.examsService.fetchExamByExamId(examId);
    return {
      message: 'Exam fetched successfully',
      data: result,
    };
  }

  // GET /exams/stats/:userId - Fetch exam statistics by userId
  @RequireOwnership('userId')
  @Get('stats/:userId')
  @HttpCode(HttpStatus.OK)
  async getExamStats(
    @Param('userId') userId: string,
    @Query() query: GetExamStatsDto,
  ) {
    const result = await this.examsService.fetchExamStatsForUserId(
      userId,
      query,
    );
    return {
      message: 'Exam statistics fetched successfully',
      data: result,
    };
  }

  // GET /exams/history/:userId - Fetch exam history by userId
  @RequireOwnership('userId')
  @Get('history/:userId')
  @HttpCode(HttpStatus.OK)
  async getExamHistory(
    @Param('userId') userId: string,
    @Query() query: GetExamStatsDto,
  ) {
    const { page, limit } = paginate(query.page, query.limit);
    const result = await this.examsService.fetchExamHistoryForUserId(
      userId,
      page,
      limit,
    );

    return {
      message: 'Exam history fetched successfully',
      data: result
    };
  }
}
