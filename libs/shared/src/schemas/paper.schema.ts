import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'papers', timestamps: true })
export class Paper extends Document {
  @Prop()
  departmentId: string;

  @Prop({ required: true })
  paperId: string;

  @Prop()
  paperCode: string;

  @Prop({ required: true, enum: ['general', 'sectional', 'full'] })
  paperType: string;

  @Prop()
  designation: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  shift: string;

  /* @Prop({ required: true })
  zones: string; //17 zones 
  */

  @Prop({ required: true })
  totalQuestions: number;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true })
  passPercentage: number;

  @Prop({ required: true })
  negativeMarking: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  usersAttempted: number;

  @Prop({ default: false })
  isFree: boolean;

  @Prop({ default: true })
  isNew: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PaperSchema = SchemaFactory.createForClass(Paper);
