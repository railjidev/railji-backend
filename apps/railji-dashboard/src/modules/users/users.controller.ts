import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  Body,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SubscriptionsService } from './subscriptions.service';
import { GrantAccessDto } from '@railji/shared';
import { RevokeAccessDto } from './dto/revoke-access.dto';
import { paginate, Roles } from '@railji/shared';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const { page: normalizedPage, limit: normalizedLimit } = paginate(page, limit);
    const result = await this.usersService.findAll(normalizedPage, normalizedLimit);
    return {
      message: 'Users retrieved successfully',
      data: result
    };
  }

  @Roles('superadmin')
  @Patch(':userId/toggle')
  @HttpCode(HttpStatus.OK)
  async toggle(@Param('userId') userId: string) {
    const result = await this.usersService.toggle(userId);
    return {
      message: 'User status updated successfully',
      data: result,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() { email, password }: { email: string; password: string }) {
    const result = await this.usersService.login({ email, password });
    return {
      message: 'Login successful',
      data: result
    };
  }

  @Roles('superadmin')
  @Post('grant-access')
  @HttpCode(HttpStatus.CREATED)
  async grantAccess(
    @Body() grantAccessDto: GrantAccessDto,
    @Req() req: any,
  ) {
    const user = await this.usersService.getUserFromRequest(req);
    const subscriptions = await this.subscriptionsService.grantAccess(grantAccessDto, user.userId);
    
    const departmentSubscriptions = subscriptions.filter(s => s.accessType === 'department');
    const paperSubscriptions = subscriptions.filter(s => s.accessType === 'paper');
    const totalPapers = paperSubscriptions.reduce((sum, sub) => sum + (sub.paperIds?.length || 0), 0);
    
    return {
      message: `Access granted successfully to user ${grantAccessDto.userId}. Created ${subscriptions.length} subscription(s).`,
      data: {
        subscriptions,
        summary: {
          totalSubscriptions: subscriptions.length,
          departmentSubscriptions: departmentSubscriptions.length,
          paperBundleSubscriptions: paperSubscriptions.length,
          totalPapersGranted: totalPapers,
        }
      },
    };
  }

  @Get(':userId/subscriptions')
  @HttpCode(HttpStatus.OK)
  async getUserSubscriptions(@Param('userId') userId: string) {
    const subscriptions = await this.subscriptionsService.getUserSubscriptions(userId);
    return {
      message: 'User subscriptions retrieved successfully',
      data: subscriptions,
    };
  }
  
  @Roles('superadmin')
  @Patch('revoke-access')
  @HttpCode(HttpStatus.OK)
  async revokeAccess(
    @Body() revokeAccessDto: RevokeAccessDto,
    @Req() req: any,
  ) {
    const { userId, departmentId, paperId } = revokeAccessDto;
    
    // Validate that exactly one is provided
    if (!departmentId && !paperId) {
      return {
        message: 'Either departmentId or paperId must be provided',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
    
    if (departmentId && paperId) {
      return {
        message: 'Only one of departmentId or paperId should be provided, not both',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }

    const user = await this.usersService.getUserFromRequest(req);
    const result = await this.subscriptionsService.revokeAccess(userId, departmentId, paperId, user.userId);
    return {
      message: result.message,
      data: {
        modifiedSubscriptions: result.modifiedSubscriptions,
        revokedAccess: departmentId ? { departmentId } : { paperId },
      },
    };
  }
}