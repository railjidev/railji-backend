import { EXAM_STATUS } from '../../../constants/app.constants';
export interface StatusCount {
  [EXAM_STATUS.IN_PROGRESS]: number;
  [EXAM_STATUS.SUBMITTED]: number;
  [EXAM_STATUS.TIMEOUT]: number;
}

export interface ExamStats {
  departmentId?: string;
  paperCode?: string;
  totalExams: number;
  statusCount: StatusCount;
  averageScore: string;
  averagePercentage: string;
  averageAccuracy: string;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  totalAttemptedQuestions: number;
  totalUnattemptedQuestions: number;
  totalTimeTaken: { hours: number; minutes: number; seconds: number };
  passedCount: number;
  failedCount: number;
  passRate: string;
  //exams?: any[];
}
