import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { paginate } from '@railji/shared';
import { Public, JwtAuthGuard } from '@libs';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Patch(':userId/toggle')
  @HttpCode(HttpStatus.OK)
  async toggle(@Param('userId') userId: string) {
    const result = await this.usersService.toggle(userId);
    return {
      message: 'User status updated successfully',
      data: result,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() { email, password }: { email: string; password: string }) {
    const result = await this.usersService.login({ email, password });
    return {
      message: 'Login successful',
      data: result
    };
  }
}