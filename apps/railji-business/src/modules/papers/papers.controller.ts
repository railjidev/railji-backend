import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PapersService } from './papers.service';
import { FetchPapersQueryDto } from './dto/paper.dto';
import { PaperAccessGuard } from './guards/paper-access.guard';
import { paginate, Roles } from '@railji/shared';
import { UsersService } from '../users/users.service';

@Controller('papers')
export class PapersController {
  constructor(
    private readonly papersService: PapersService,
    private readonly usersService: UsersService,
  ) {}

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
  async getDepartmentPapers(
    @Param('departmentId') departmentId: string,
    @Query() query: FetchPapersQueryDto,
    @Req() req: any,
  ) {
    const user = await this.usersService.getUserFromRequest(req);
    return this.buildDepartmentPapersResponse(departmentId, query, user.userId);
  }


  @UseGuards(PaperAccessGuard)
  @Get(':departmentId/:paperId')
  @HttpCode(HttpStatus.OK)
  async fetchQuestionsForDepartmentPaper(
    @Param('departmentId') departmentId: string,
    @Param('paperId') paperId: string,
    @Req() req: any,
  ) {
    // Read paper from req.paper (set by PaperAccessGuard)
    const paper = req.paper;
    
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

  @Roles('superadmin')
  @Get(':departmentId/user/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserDepartmentPapers(
    @Param('userId') userId: string,
    @Param('departmentId') departmentId: string,
    @Query() query: FetchPapersQueryDto,
    @Req() req: any,
  ) {
    return this.buildDepartmentPapersResponse(departmentId, query, userId);
  }

  private async buildDepartmentPapersResponse(
    departmentId: string,
    query: FetchPapersQueryDto,
    userId: string,
  ) {
    const { page, limit } = paginate(query.page, query.limit);

    // Build search query from optional filters
    const searchQuery: FetchPapersQueryDto = {};
    if (query.designation) searchQuery.designation = query.designation;
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
      userId,
    );

    return {
      message: 'Papers retrieved successfully',
      data: {
        papers: result.papers,
        metadata: { 
          designations: result.designations,
          paperCodes: result.paperCodes 
        },
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    };
  }
}
