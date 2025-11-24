export type StepStatus = 'SUCCESS' | 'FAILED';

export interface StepExecutionResult {
  id: string;
  command: string;
  status: StepStatus;
  stdout: string;
  stderr: string;
  exitCode: number;
  startedAt: Date;
  finishedAt: Date;
  durationSeconds: number;
}
