import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PapersController } from './papers.controller';
import { PapersService } from './papers.service';
import {
  Paper,
  PaperSchema,
  QuestionBank,
  QuestionBankSchema,
  User,
  UserSchema,
} from '@railji/shared';
import { SharedCommonModule } from '@railji/shared';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Paper.name, schema: PaperSchema },
      { name: QuestionBank.name, schema: QuestionBankSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    SharedCommonModule,
  ],
  controllers: [PapersController],
  providers: [PapersService],
  exports: [PapersService],
})
export class PapersModule {}
