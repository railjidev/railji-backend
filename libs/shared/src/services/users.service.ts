import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';

@Injectable()
export class SharedUsersService {
  constructor(
    @InjectModel(User.name)
    protected readonly userModel: Model<User>,
  ) {}

  /**
   * Extract user from JWT token in request
   * Flow: JWT token → supabaseId → User from DB
   * Returns the complete User object
   */
  async getUserFromRequest(req: any): Promise<User> {
    const supabaseId = req.user?.userId;

    if (!supabaseId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = await this.userModel.findOne({ supabaseId }).exec();

    if (!user) {
      throw new UnauthorizedException('User not found in database');
    }

    return user;
  }
}
