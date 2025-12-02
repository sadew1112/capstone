// src/auto-action/models/solution-execution-result.model.ts
import { StepExecutionResult } from './step-execution-result.model';

export type SolutionOverallStatus =
  | 'SUCCESS'
  | 'PRECHECK_FAILED'
  | 'ACTION_FAILED_ROLLBACK_SUCCEEDED'
  | 'ACTION_FAILED_ROLLBACK_FAILED';

export interface SolutionExecutionResult {
  version: string;

  // 식별 정보
  alertId: number;
  alertLogId: number;
  decision: string;
  approvedBy: string;
  approvedAt: string;

  overallStatus: SolutionOverallStatus;

  precheckResults: StepExecutionResult[];
  actionResults: StepExecutionResult[];
  rollbackResults: StepExecutionResult[];
}

export interface SolutionOutputResult {
  overallStatus: SolutionOverallStatus;
  precheckResults: StepExecutionResult[];
  actionResults: StepExecutionResult[];
  rollbackResults: StepExecutionResult[];
}

export interface SolutionOutput {
  result: SolutionOutputResult;
}


