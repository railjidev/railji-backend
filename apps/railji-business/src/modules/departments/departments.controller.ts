import { Controller, Get, Query, HttpStatus, HttpCode, Param, Req } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { Roles } from '@libs';
import { UsersService } from '../users/users.service';

@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query?: any, @Req() req?: any) {
    let userId: string | null = null;
    
    // Try to get user if authenticated
    if (req?.user) {
      try {
        const user = await this.usersService.getUserFromRequest(req);
        userId = user.userId;
      } catch (error) {
        // User not authenticated, proceed without userId
      }
    }

    const result = await this.departmentsService.fetchAllDepartments(query, userId);
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

  @Roles('superadmin')
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserDepartments(
    @Param('userId') userId: string,
    @Req() req: any,
    @Query() query?: any,
  ) {
    const result = await this.departmentsService.fetchAllDepartments(query, userId);
    return {
      message: 'Departments retrieved successfully',
      data: result,
    };
  }
}
