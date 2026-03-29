import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  Get,
  Req,
} from '@nestjs/common';
import { PapersService } from './papers.service';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { Roles, SharedUsersService } from '@railji/shared';

@Controller('papers')
export class PapersController {
  constructor(
    private readonly papersService: PapersService,
    private readonly sharedUsersService: SharedUsersService,
  ) {}

  @Roles('admin', 'superadmin')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPaperDto: CreatePaperDto,
    @Req() req: any,
  ) {
    const user = await this.sharedUsersService.getUserFromRequest(req);
    const result = await this.papersService.createPaper(createPaperDto, user.userId);
    return {
      message: 'Paper created successfully',
      data: result,
    };
  }

  @Roles('admin', 'superadmin')
  @Patch(':paperId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('paperId') paperId: string,
    @Body() updatePaperDto: UpdatePaperDto,
    @Req() req: any,
  ) {
    const user = await this.sharedUsersService.getUserFromRequest(req);
    const result = await this.papersService.updatePaper(
      paperId,
      updatePaperDto,
      user.userId,
    );
    return {
      message: 'Paper updated successfully',
      data: result,
    };
  }

  @Roles('superadmin')
  @Delete(':paperId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('paperId') paperId: string,
    @Req() req: any,
  ) {
    const user = await this.sharedUsersService.getUserFromRequest(req);
    await this.papersService.deletePaper(paperId, user.userId);
    return {
      message: 'Paper deleted successfully',
    };
  }

  @Roles('admin', 'superadmin')
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getDashboardStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.papersService.getDashboardStats(startDate, endDate);
    return {
      message: 'Paper logs retrieved successfully',
      data: result,
    };
  }
}
