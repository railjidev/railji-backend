import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'audit-logs', timestamps: true })
export class AuditLog extends Document {
  @Prop({ required: true })
  adminId: string;

  @Prop({ required: true, enum: ['create', 'update', 'delete', 'grant', 'revoke'] })
  action: string;

  @Prop({ required: true, type: Object })
  metadata: {
    paperId?: string;
    departmentId?: string;
    userId?: string;
  };

  @Prop({ required: true })
  message: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
