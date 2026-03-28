import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, generateUserId } from '@libs';
import { SharedUsersService } from '@railji/shared';
import { CreateUserDto } from './dto/create-user.dto';
import { ErrorHandlerService } from '@railji/shared';

@Injectable()
export class UsersService extends SharedUsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name)
    userModel: Model<User>,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    super(userModel);
  }

  async createOrGetUser(createUserDto: CreateUserDto): Promise<{ user: User; created: boolean }> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        $or: [
          { supabaseId: createUserDto.supabaseId },
          { email: createUserDto.email },
        ],
      });

      if (existingUser) {
        // Update lastLoggedIn for existing user
        existingUser.lastLoggedIn = new Date();
        const updatedUser = await existingUser.save();
        
        this.logger.log(`User already exists with userId: ${existingUser.userId}, updated lastLoggedIn`);
        return { user: updatedUser, created: false };
      }

      // Generate nanoId for userId
      const userId = generateUserId();

      const newUser = new this.userModel({
        userId,
        ...createUserDto,
        lastLoggedIn: new Date(),
      });

      const savedUser = await newUser.save();
      this.logger.log(`User created successfully with userId: ${userId}`);

      return { user: savedUser, created: true };
    } catch (error) {
      this.errorHandler.handle(error, { context: 'UsersService.createUser' });
    }
  }

  async findAllUsers(): Promise<User[]> {
    try {
      const users = await this.userModel.find().exec();

      if (!users || users.length === 0) {
        throw new NotFoundException('No users found');
      }

      this.logger.log(`Found ${users.length} users`);

      return users;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'UsersService.findAllUsers' });
    }
  }

  // getUserFromRequest is inherited from SharedUsersService

  async updateLastLoggedIn(userId: string): Promise<User> {
    try {
      const user = await this.userModel.findOneAndUpdate(
        { userId },
        { lastLoggedIn: new Date() },
        { new: true }
      ).exec();

      if (!user) {
        throw new NotFoundException(`User with userId ${userId} not found`);
      }

      this.logger.log(`Updated lastLoggedIn for user with userId: ${userId}`);
      return user;
    } catch (error) {
      this.errorHandler.handle(error, { context: 'UsersService.updateLastLoggedIn' });
    }
  }
}
