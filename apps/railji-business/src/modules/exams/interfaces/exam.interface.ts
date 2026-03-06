import { EXAM_SUBMISSION_STATUS } from '../../../constants/app.constants';

export interface ExamSubmissionStatusCount {
  [EXAM_SUBMISSION_STATUS.IN_PROGRESS]: number;
  [EXAM_SUBMISSION_STATUS.SUBMITTED]: number;
  [EXAM_SUBMISSION_STATUS.ABANDONED]: number;
  [EXAM_SUBMISSION_STATUS.TIMEOUT]: number;
}

export interface DepartmentStats {
  departmentId: string;
  totalExams: number;
  examSubmissionStatusCount: ExamSubmissionStatusCount;
  averageScore: string;
  averagePercentage: string;
  averageAccuracy: string;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  totalAttemptedQuestions: number;
  totalUnattemptedQuestions: number;
  passedCount: number;
  failedCount: number;
  passRate: string;
  exams?: any[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ExamQueryParams {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export interface ExamsByUserIdResponse {
  totalExams: number;
  totalDepartments: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  departments: DepartmentStats[];
}
