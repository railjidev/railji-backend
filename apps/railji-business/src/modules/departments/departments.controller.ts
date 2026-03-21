import { Controller, Get, Query, HttpStatus, HttpCode, Param } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { Public } from '../auth';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query?: any) {
    const result = await this.departmentsService.fetchAllDepartments(query);
    return {
      message: 'Departments retrieved successfully',
      data: result,
    };
  }

  @Public()
  @Get(':departmentId/materials')
  @HttpCode(HttpStatus.OK)
  async getMaterialsByDepartment(
    @Param('departmentId') departmentId: string,
    @Query() query?: any,
  ) {
    const result = await this.departmentsService.fetchMaterialsByDepartment(
      departmentId,
      query,
    );
    return {
      message: 'Materials retrieved successfully',
      data: result,
    };
  }
}
