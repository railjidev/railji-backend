import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SubscriptionsService } from './subscriptions.service';
import { User, UserSchema, Subscription, SubscriptionSchema } from '@railji/shared';
import { SharedCommonModule } from '@railji/shared';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    SharedCommonModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, SubscriptionsService],
  exports: [UsersService, SubscriptionsService],
})
export class UsersModule {}