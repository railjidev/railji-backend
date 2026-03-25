import { Controller, Get, Query, HttpStatus, HttpCode, Param, Headers } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query?: any, @Headers('authorization') authHeader?: string) {
    let supabaseId: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        supabaseId = payload.sub;
      } catch (error) {
        // Ignore token parsing errors, just proceed without user
      }
    }

    const result = await this.departmentsService.fetchAllDepartments(query, supabaseId);
    return {
      message: 'Departments retrieved successfully',
      data: result,
    };
  }

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
