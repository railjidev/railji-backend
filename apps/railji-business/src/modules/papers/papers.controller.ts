import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PapersService } from './papers.service';
import { FetchPapersQueryDto } from './dto/paper.dto';
import { Public } from '../auth';

@Controller('papers')
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query?: any) {
    const papers = await this.papersService.findAll(query);
    return {
      message: 'Papers retrieved successfully',
      data: papers,
    };
  }

  @Public()
  @Get('top')
  @HttpCode(HttpStatus.OK)
  async getTopPapers() {
    const papers = await this.papersService.getTopPapers();
    return {
      message: 'Top papers retrieved successfully',
      data: papers,
    };
  }

  @Get(':departmentId')
  @HttpCode(HttpStatus.OK)
  async fetchPapersForDepartment(
    @Param('departmentId') departmentId: string,
    @Query() query: FetchPapersQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;

    // Build search query from optional filters
    const searchQuery: FetchPapersQueryDto = {};
    if (query.paperCode) searchQuery.paperCode = query.paperCode;
    if (query.paperType) searchQuery.paperType = query.paperType;
    if (query.year) searchQuery.year = query.year;
    if (query.sortBy) searchQuery.sortBy = query.sortBy;
    if (query.sortOrder) searchQuery.sortOrder = query.sortOrder;

    const result = await this.papersService.fetchPapersForDepartment(
      departmentId,
      page,
      limit,
      searchQuery,
    );

    return {
      message: 'Papers retrieved successfully',
      data: {
        papers: result.papers,
        metadata: { paperCodes: result.paperCodes },
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Public()
  @Get(':departmentId/:paperId')
  @HttpCode(HttpStatus.OK)
  async fetchQuestionsForDepartmentPaper(
    @Param('departmentId') departmentId: string,
    @Param('paperId') paperId: string,
  ) {
    const questions = await this.papersService.fetchQuestionsForDepartmentPaper(
      departmentId,
      paperId,
    );
    return {
      message: 'Questions retrieved successfully',
      data: questions,
    };
  }

  @Get(':departmentId/:paperId/answers')
  @HttpCode(HttpStatus.OK)
  async fetchAnswersForPaper(
    @Param('departmentId') departmentId: string,
    @Param('paperId') paperId: string,
  ) {
    const answers = await this.papersService.fetchAnswersForDepartmentPaper(
      departmentId,
      paperId,
    );
    return {
      message: 'Answers retrieved successfully',
      data: answers,
    };
  }

  @Get(':paperId/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  async fetchQuestionForPaper(
    @Param('paperId') paperId: string,
    @Param('questionId') questionId: string,
  ) {
    const question = await this.papersService.fetchQuestionForPaper(
      paperId,
      questionId,
    );
    return {
      message: 'Question retrieved successfully',
      data: question,
    };
  }
}
