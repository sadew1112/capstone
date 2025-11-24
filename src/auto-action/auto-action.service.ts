import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SolutionDto } from './dto/solution.dto';
import { StepDto } from './dto/step.dto';
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
  constructor(
    private readonly executor: CommandExecutorService,
  ) {}

  async executeAll(
    rawSolutions: any,
  ): Promise<SolutionExecutionResult[]> {
    if (!Array.isArray(rawSolutions) || rawSolutions.length === 0) {
      throw new BadRequestException(
        'Request body must be a non-empty array of Solution objects',
      );
    }

    const solutions: SolutionDto[] = [];
    for (let i = 0; i < rawSolutions.length; i++) {
      const instance = plainToInstance(SolutionDto, rawSolutions[i]);
      const errors = await validate(instance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const constraints = errors
          .map((e) => Object.values(e.constraints || {}))
          .flat();
        throw new BadRequestException(
          `Invalid solution at index ${i}: ${constraints.join(', ')}`,
        );
      }
      solutions.push(instance);
    }

    const results: SolutionExecutionResult[] = [];
    for (const solution of solutions) {
      const result = await this.executeSingle(solution);
      results.push(result);
    }

    return results;
  }

  private async executeSingle(
    solution: SolutionDto,
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
        overallStatus,
        precheckResults,
        actionResults,
        rollbackResults,
      };
    }

    // actions 실행 (prechecks 모두 성공한 경우)
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
      // actions 모두 성공 → overall SUCCESS
      overallStatus = 'SUCCESS';
      return {
        version: solution.version,
        alertId: solution.alert.id,
        alertName: solution.alert.name,
        severity: solution.alert.severity,
        instance: solution.alert.instance,
        overallStatus,
        precheckResults,
        actionResults,
        rollbackResults,
      };
    }

    // 3) rollback 실행 (action 실패한 경우만)
    let rollbackFailed = false;
    for (const step of solution.rollback || []) {
      const stepResult = await this.runStep(step);
      rollbackResults.push(stepResult);
      if (stepResult.status === 'FAILED') {
        rollbackFailed = true;
        // 실패 시 즉시 중단
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
}

