import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import {
  SubmitExamDto,
  StartExamDto,
  GetExamsByUserIdDto,
} from './dto/exam.dto';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // POST /exams/start - Start exam session
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startExam(@Body() startExamDto: StartExamDto) {
    const result = await this.examsService.startExam(startExamDto);
    return {
      message: 'Exam session started successfully',
      data: result,
    };
  }

  // POST /exams/submit - Submit exam answers
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submitExam(@Body() submitExamDto: SubmitExamDto) {
    const result = await this.examsService.submitExam(submitExamDto);
    return {
      message: 'Exam submitted successfully',
      data: result,
    };
  }

  // GET /result/:examId - Fetch exam by examId
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
  @Get('stats/:userId')
  @HttpCode(HttpStatus.OK)
  async getExamsByUserId(
    @Param('userId') userId: string,
    @Query() query: GetExamsByUserIdDto,
  ) {
    const result = await this.examsService.fetchExamsByUserId(userId, query);
    return {
      message: 'Exam statistics fetched successfully',
      data: result,
    };
  }
}
