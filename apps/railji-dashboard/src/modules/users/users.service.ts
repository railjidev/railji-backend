import { ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, ErrorHandlerService, generateUserId, SharedUsersService } from '@railji/shared';
import { calculateSkip, pagination } from '@railji/shared';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/config';

@Injectable()
export class UsersService extends SharedUsersService {
  private readonly logger = new Logger(UsersService.name);
  private supabase;

  constructor(
    @InjectModel(User.name) userModel: Model<User>,
    private errorHandler: ErrorHandlerService,
  ) {
    super(userModel);
    // Initialize Supabase client
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey
    );
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = calculateSkip(page, limit);

      const [users, total] = await Promise.all([
        this.userModel
          .find()
          .select('-password')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        this.userModel.countDocuments().exec(),
      ]);

      return {
        users,
        ...pagination(page, limit, total),
      };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'UsersService.findAll',
      });
    }
  }

  // getUserFromRequest and findUserById are inherited from SharedUsersService

  async toggle(userId: string) {
    try {
      const user = await this.userModel.findById(userId).exec();
      
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Toggle the isActive field (default to true if not set)
      const currentActiveStatus = (user as any).isActive ?? true;
      const newActiveStatus = !currentActiveStatus;
      
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { isActive: newActiveStatus },
          { new: true }
        )
        .select('-password')
        .lean()
        .exec();

      this.logger.log(`User ${userId} active status toggled to ${newActiveStatus}`);
      
      return {
        userId,
        isActive: newActiveStatus,
        user: updatedUser,
      };
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'UsersService.toggleActive',
      });
    }
  }

  async login({ email, password }: { email: string; password: string }): Promise<{ user: User; accessToken: string }> {
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        this.logger.warn(`Authentication failed for email: ${email}`, authError.message);
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!authData.user) {
        throw new UnauthorizedException('Authentication failed');
      }

      const supabaseId = authData.user.id;
      const userEmail = authData.user.email;

      // Check if user exists in our database
      const existingUser = await this.userModel.findOne({
        $or: [
          { email: userEmail },
          { supabaseId },
        ],
      });

      if (!existingUser) {
        this.logger.warn(`User not found in database for email: ${userEmail}`);
        throw new UnauthorizedException('User not authorized for dashboard access');
      }

      // Check if user has admin or superadmin role
      if (existingUser.userType !== 'admin' && existingUser.userType !== 'superadmin') {
        this.logger.warn(`User ${userEmail} attempted dashboard login with userType: ${existingUser.userType}`);
        throw new ForbiddenException('User not authorized for dashboard access');
      }

      // Update lastLoggedIn for existing user
      existingUser.lastLoggedIn = new Date();
      existingUser.supabaseId = supabaseId; // Ensure supabaseId is updated
      const updatedUser = await existingUser.save();
      
      this.logger.log(`User logged in with userId: ${existingUser.userId}, updated lastLoggedIn`);
      
      return { 
        user: updatedUser, 
        accessToken: authData.session.access_token
      };
    } catch (error) {
      this.errorHandler.handle(error, { context: 'UsersService.login' });
    }
  }
}