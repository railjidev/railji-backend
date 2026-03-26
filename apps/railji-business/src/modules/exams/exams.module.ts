import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { Exam, ExamSchema } from './schemas/exam.schema';
import { PapersModule } from '../papers/papers.module';
import { UsersModule } from '../users/users.module';
import { SharedCommonModule } from '@railji/shared';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Exam.name, schema: ExamSchema }]),
    PapersModule,
    UsersModule,
    SharedCommonModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
