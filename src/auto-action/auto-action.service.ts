// src/auto-action/auto-action.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

import {
  SolutionExecutionResult,
  SolutionOverallStatus,
  SolutionOutput,
} from './models/solution-execution-result.model';
import {
  StepExecutionResult,
  StepStatus,
} from './models/step-execution-result.model';
import { CommandExecutorService } from './command-executor.service';
import { ExecutionRequestDto } from './dto/execution-request.dto';
import { SolutionDto } from './dto/solution.dto';
import { StepDto } from './dto/step.dto';

@Injectable()
export class AutoActionService {
  private readonly logger = new Logger(AutoActionService.name);

  constructor(
    private readonly executor: CommandExecutorService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 컨트롤러에서 바로 호출하는 단일 요청 진입점
   * - ValidationPipe를 통과한 ExecutionRequestDto만 들어옴
   * - executeSingle로 실행 → Alert API로 전송 → 외부 응답 형태로 변환
   */
  async executeAndBuildOutput(
    request: ExecutionRequestDto,
  ): Promise<SolutionOutput> {
    const result = await this.executeSingle(request.plan, request);

    // Alert API로 개별 결과 전송
    await this.sendResultToAlertApi(result);

    return this.buildOutput(result);
  }

  /**
   * 내부: 실제 precheck → action → rollback 실행 로직
   */
  private async executeSingle(
    solution: SolutionDto,
    request: ExecutionRequestDto,
  ): Promise<SolutionExecutionResult> {
    const precheckResults: StepExecutionResult[] = [];
    const actionResults: StepExecutionResult[] = [];
    const rollbackResults: StepExecutionResult[] = [];

    // 1) Prechecks
    let precheckFailed = false;
    for (const step of solution.prechecks || []) {
      const stepResult = await this.runStep(step);
      precheckResults.push(stepResult);
      if (stepResult.status === 'FAILED') {
        precheckFailed = true;
        break;
      }
    }

    let overallStatus: SolutionOverallStatus;

    if (precheckFailed) {
      overallStatus = 'PRECHECK_FAILED';
      return {
        version: solution.version,

        alertId: request.alertId,
        alertLogId: request.alertLogId,
        decision: request.decision,
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,

        overallStatus,
        precheckResults,
        actionResults,
        rollbackResults,
      };
    }

    // 2) Actions
    let actionFailed = false;
    for (const step of solution.actions || []) {
      const stepResult = await this.runStep(step);
      actionResults.push(stepResult);
      if (stepResult.status === 'FAILED') {
        actionFailed = true;
        break;
      }
    }

    if (!actionFailed) {
      overallStatus = 'SUCCESS';
      return {
        version: solution.version,

        alertId: request.alertId,
        alertLogId: request.alertLogId,
        decision: request.decision,
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,

        overallStatus,
        precheckResults,
        actionResults,
        rollbackResults,
      };
    }

    // 3) Rollback
    let rollbackFailed = false;
    for (const step of solution.rollback || []) {
      const stepResult = await this.runStep(step);
      rollbackResults.push(stepResult);
      if (stepResult.status === 'FAILED') {
        rollbackFailed = true;
        break;
      }
    }

    overallStatus = rollbackFailed
      ? 'ACTION_FAILED_ROLLBACK_FAILED'
      : 'ACTION_FAILED_ROLLBACK_SUCCEEDED';

    return {
      version: solution.version,

      alertId: request.alertId,
      alertLogId: request.alertLogId,
      decision: request.decision,
      approvedBy: request.approvedBy,
      approvedAt: request.approvedAt,

      overallStatus,
      precheckResults,
      actionResults,
      rollbackResults,
    };
  }

  private async runStep(step: StepDto): Promise<StepExecutionResult> {
    const {
      stdout,
      stderr,
      exitCode,
      startedAt,
      finishedAt,
      durationSeconds,
    } = await this.executor.runCommand(step.command);

    const status: StepStatus = exitCode === 0 ? 'SUCCESS' : 'FAILED';

    return {
      id: step.id,
      command: step.command,
      status,
      stdout,
      stderr,
      exitCode,
      startedAt,
      finishedAt,
      durationSeconds,
    };
  }

  private buildOutput(result: SolutionExecutionResult): SolutionOutput {
    return {
      result: {
        overallStatus: result.overallStatus,
        precheckResults: result.precheckResults,
        actionResults: result.actionResults,
        rollbackResults: result.rollbackResults,
      },
    };
  }

  private async sendResultToAlertApi(
    result: SolutionExecutionResult,
  ): Promise<void> {
    const url = `http://158.180.90.191:80/api/alerts/${result.alertId}/result`;

    const payload = this.buildOutput(result);

    try {
      await lastValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      this.logger.log(
        `Successfully sent result to Alert API for alertId=${result.alertId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send result to Alert API for alertId=${result.alertId}: ${
          error?.message || error
        }`,
      );
    }
  }
}
