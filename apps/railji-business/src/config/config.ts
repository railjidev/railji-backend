import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

export const config = {
  app: {
    name: process.env.APP_NAME || 'railji-business',
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    uri: process.env.MONGODB_URI,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    jwtAudience: process.env.SUPABASE_JWT_AUDIENCE || 'authenticated',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    maxFiles: process.env.LOG_MAX_FILES || '14',
  },
};
