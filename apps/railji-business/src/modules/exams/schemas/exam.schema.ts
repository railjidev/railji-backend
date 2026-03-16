import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EXAM_STATUS } from '../../../constants/app.constants';

/* ---------- Sub Schemas ---------- */

@Schema({ _id: false })
export class Response {
  @Prop({ required: true })
  questionId: number;

  @Prop({ required: true })
  selectedOption: number;

  @Prop({ default: false })
  isFlagged: boolean;
}

export const ResponseSchema = SchemaFactory.createForClass(Response);

@Schema({ _id: false })
export class DeviceInfo {
  @Prop({ default: 'Unknown' })
  browser: string;

  @Prop({ default: 'Unknown' })
  os: string;

  @Prop({ default: 'Unknown' })
  device: string;

  @Prop({ default: 'Unknown' })
  ipAddress: string;

  @Prop({ default: 'Unknown' })
  userAgent: string;
}

export const DeviceInfoSchema = SchemaFactory.createForClass(DeviceInfo);

/* ---------- Main Schema ---------- */

@Schema({ collection: 'exams', timestamps: true })
export class Exam extends Document {
  @Prop({ required: true, unique: true })
  examId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  paperId: string;

  @Prop()
  paperName: string;

  @Prop()
  paperCode: string;

  @Prop({ enum: ['general', 'sectional', 'full'] })
  paperType: string;

  @Prop({ required: true })
  departmentId: string;

  @Prop({ type: [ResponseSchema], default: [] })
  responses: Response[];

  @Prop({ default: 0 })
  totalQuestions: number;

  @Prop({ default: 0 })
  attemptedQuestions: number;

  @Prop({ default: 0 })
  unattemptedQuestions: number;

  @Prop({ default: 0 })
  correctAnswers: number;

  @Prop({ default: 0 })
  incorrectAnswers: number;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 0 })
  maxScore: number;

  @Prop({ default: 0 })
  percentage: number;

  @Prop({ default: 0 })
  accuracy: number;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ type: Object, default: { hours: 0, minutes: 0, seconds: 0 } })
  timeTaken: { hours: number; minutes: number; seconds: number };

  @Prop({
    required: true,
    enum: Object.values(EXAM_STATUS),
    default: EXAM_STATUS.IN_PROGRESS,
  })
  status: string;

  @Prop({ default: 0 })
  percentile: number;

  @Prop({ default: false })
  isPassed: boolean;

  @Prop({ default: 0 })
  passPercentage: number;

  @Prop({ type: DeviceInfoSchema, required: true })
  deviceInfo: DeviceInfo;

  @Prop()
  remarks: string;
}

export const ExamSchema = SchemaFactory.createForClass(Exam);
