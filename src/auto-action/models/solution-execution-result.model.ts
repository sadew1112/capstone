import { StepExecutionResult } from './step-execution-result.model';

export type SolutionOverallStatus =
  | 'SUCCESS' // 성공
  | 'PRECHECK_FAILED' // 사전 점검 실패
  | 'ACTION_FAILED_ROLLBACK_SUCCEEDED' // 롤백 성공
  | 'ACTION_FAILED_ROLLBACK_FAILED'; // 롤백 실패

export interface SolutionExecutionResult {
  version: string;
  alertId: number;
  alertName: string;
  severity: string;
  instance: string;

  overallStatus: SolutionOverallStatus;

  precheckResults: StepExecutionResult[];
  actionResults: StepExecutionResult[];
  rollbackResults: StepExecutionResult[];
}
