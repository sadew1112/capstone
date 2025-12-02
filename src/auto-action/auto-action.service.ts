// src/auto-action/auto-action.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

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
   * 컨트롤러/외부에서 사용하는 진입점:
   * - rawRequests 배열을 처리하고
   * - 첫 번째 결과를 기준으로 SolutionOutput 형태로 변환해 반환
   */
  async executeAllAndBuildOutput(rawRequests: any): Promise<SolutionOutput> {
    const results = await this.executeAll(rawRequests);
    const first = results[0];

    return this.buildOutput(first);
  }

  /**
   * 내부용: 모든 요청을 처리해서 풀 정보 결과 배열을 반환
   */
  async executeAll(
    rawRequests: any,
  ): Promise<SolutionExecutionResult[]> {
    if (!Array.isArray(rawRequests) || rawRequests.length === 0) {
      throw new BadRequestException(
        'Request body must be a non-empty array of execution requests',
      );
    }

    const requests: ExecutionRequestDto[] = [];
    for (let i = 0; i < rawRequests.length; i++) {
      const instance = plainToInstance(
        ExecutionRequestDto,
        rawRequests[i],
      );
      const errors = await validate(instance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const constraints = errors
          .map((e) => Object.values(e.constraints || {}))
          .flat();
        throw new BadRequestException(
          `Invalid execution request at index ${i}: ${constraints.join(
            ', ',
          )}`,
        );
      }

      requests.push(instance);
    }

    const results: SolutionExecutionResult[] = [];

    for (const req of requests) {
      const result = await this.executeSingle(req.plan, req);
      results.push(result);

      // Alert API로는 여기에서 개별 결과를 전송
      await this.sendResultToAlertApi(result);
    }

    return results;
  }

  private async executeSingle(
    solution: SolutionDto,
    request: ExecutionRequestDto,
  ): Promise<SolutionExecutionResult> {
    const precheckResults: StepExecutionResult[] = [];
    const actionResults: StepExecutionResult[] = [];
    const rollbackResults: StepExecutionResult[] = [];

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
        alertId: solution.alert.id,
        alertName: solution.alert.name,
        severity: solution.alert.severity,
        instance: solution.alert.instance,

        alertLogId: request.alertLogId,
        decision: request.decision,
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,
        feedback: solution.feedback,

        overallStatus,
        precheckResults,
        actionResults,
        rollbackResults,
      };
    }

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
        alertId: solution.alert.id,
        alertName: solution.alert.name,
        severity: solution.alert.severity,
        instance: solution.alert.instance,

        alertLogId: request.alertLogId,
        decision: request.decision,
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,
        feedback: solution.feedback,

        overallStatus,
        precheckResults,
        actionResults,
        rollbackResults,
      };
    }

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
      alertId: solution.alert.id,
      alertName: solution.alert.name,
      severity: solution.alert.severity,
      instance: solution.alert.instance,

      alertLogId: request.alertLogId,
      decision: request.decision,
      approvedBy: request.approvedBy,
      approvedAt: request.approvedAt,
      feedback: solution.feedback,

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

  /**
   * 내부 SolutionExecutionResult → 외부로 나갈 최종 형태로 변환
   * {
   *   "result": {
   *     "overallStatus": "...",
   *     "precheckResults": [...],
   *     "actionResults": [...],
   *     "rollbackResults": [...]
   *   }
   * }
   */
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

  /**
   * Alert API로도 동일한 형태의 JSON을 전송
   */
  private async sendResultToAlertApi(
    result: SolutionExecutionResult,
  ): Promise<void> {
    const url = `http://158.180.90.191:80/alerts/${result.alertId}/result`;

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


