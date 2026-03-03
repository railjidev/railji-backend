import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { nanoid } from 'nanoid';
import { User } from '@libs';
import { CreateUserDto } from './dto/create-user.dto';
import { CacheService, ErrorHandlerService } from '@railji/shared';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cacheService: CacheService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        $or: [
          { supabaseId: createUserDto.supabaseId },
          { email: createUserDto.email },
        ],
      });

      if (existingUser) {
        throw new ConflictException('User with this supabaseId or email already exists');
      }

      // Generate nanoId for userId
      const userId = nanoid();

      const newUser = new this.userModel({
        userId,
        ...createUserDto,
      });

      const savedUser = await newUser.save();
      this.logger.log(`User created successfully with userId: ${userId}`);

      return savedUser;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'UsersService.createUser' });
    }
  }

  async findAllUsers(): Promise<User[]> {
    try {
      const cacheKey = 'all_users';

      // Check cache first
      const cached = this.cacheService.get<User[]>(cacheKey);

      if (cached) {
        this.logger.debug('Returning cached users data');
        return cached;
      }

      const users = await this.userModel.find().exec();

      if (!users || users.length === 0) {
        throw new NotFoundException('No users found');
      }

      // Cache the result
      this.cacheService.set(cacheKey, users, this.CACHE_TTL);
      this.logger.log(`Found ${users.length} users`);

      return users;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'UsersService.findAllUsers' });
    }
  }

  async findUserById(userId: string): Promise<User> {
    try {
      const cacheKey = `user_${userId}`;

      // Check cache first
      const cached = this.cacheService.get<User>(cacheKey);

      if (cached) {
        this.logger.debug(`Returning cached user data for userId: ${userId}`);
        return cached;
      }

      const user = await this.userModel.findOne({ userId }).exec();

      if (!user) {
        throw new NotFoundException(`User with userId ${userId} not found`);
      }

      // Cache the result
      this.cacheService.set(cacheKey, user, this.CACHE_TTL);
      this.logger.log(`Found user with userId: ${userId}`);

      return user;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'UsersService.findUserById' });
    }
  }

  async findUserBySupabaseId(supabaseId: string): Promise<User> {
    try {
      const cacheKey = `user_supabase_${supabaseId}`;

      // Check cache first
      const cached = this.cacheService.get<User>(cacheKey);

      if (cached) {
        this.logger.debug(`Returning cached user data for supabaseId: ${supabaseId}`);
        return cached;
      }

      const user = await this.userModel.findOne({ supabaseId }).exec();

      if (!user) {
        throw new NotFoundException(`User with supabaseId ${supabaseId} not found`);
      }

      // Cache the result
      this.cacheService.set(cacheKey, user, this.CACHE_TTL);
      this.logger.log(`Found user with supabaseId: ${supabaseId}`);

      return user;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'UsersService.findUserBySupabaseId' });
    }
  }
}
