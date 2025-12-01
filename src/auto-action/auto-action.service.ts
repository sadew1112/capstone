import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SolutionDto } from './dto/solution.dto';
import { StepDto } from './dto/step.dto';
import { ExecutionRequestDto } from './dto/execution-request.dto';
import { CommandExecutorService } from './command-executor.service';
import {
  SolutionExecutionResult,
  SolutionOverallStatus,
} from './models/solution-execution-result.model';
import {
  StepExecutionResult,
  StepStatus,
} from './models/step-execution-result.model';

@Injectable()
export class AutoActionService {
  private readonly logger = new Logger(AutoActionService.name);

  constructor(
    private readonly executor: CommandExecutorService,
    private readonly httpService: HttpService,
  ) {}

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

  private async sendResultToAlertApi(
    result: SolutionExecutionResult,
  ): Promise<void> {
    const url = `http://158.180.90.191:80/alerts/${result.alertId}/result`;

    try {
      await lastValueFrom(
        this.httpService.post(url, result, {
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

