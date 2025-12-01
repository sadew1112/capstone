// src/auto-action/models/solution-execution-result.model.ts
import { StepExecutionResult } from './step-execution-result.model';

export type SolutionOverallStatus =
  | 'SUCCESS'
  | 'PRECHECK_FAILED'
  | 'ACTION_FAILED_ROLLBACK_SUCCEEDED'
  | 'ACTION_FAILED_ROLLBACK_FAILED';

export interface SolutionExecutionResult {
  // 플랜 정보
  version: string;
  alertId: number;
  alertName: string;
  severity: string;
  instance: string;

  // 승인/로그 메타 정보
  alertLogId: number;
  decision: string;
  approvedBy: string;
  approvedAt: string;
  feedback?: string;

  overallStatus: SolutionOverallStatus;

  precheckResults: StepExecutionResult[];
  actionResults: StepExecutionResult[];
  rollbackResults: StepExecutionResult[];
}
