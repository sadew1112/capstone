import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';

@Injectable()
export class CommandExecutorService {
  private readonly logger = new Logger(CommandExecutorService.name);

  private readonly dryRun: boolean =
    process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1';

  runCommand(command: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    startedAt: Date;
    finishedAt: Date;
    durationSeconds: number;
  }> {
    const startedAt = new Date();

    // DRY_RUN
    if (this.dryRun) {
      const finishedAt = new Date();
      const durationSeconds =
        (finishedAt.getTime() - startedAt.getTime()) / 1000;

      const message = `[DRY_RUN] ${command}`;
      this.logger.log(message);

      return Promise.resolve({
        stdout: message,
        stderr: '',
        exitCode: 0,
        startedAt,
        finishedAt,
        durationSeconds,
      });
    }

    // 실제 실행
    this.logger.log(`Executing command: ${command}`);

    return new Promise((resolve) => {
      const child = exec(command, (error, stdout, stderr) => {
        const finishedAt = new Date();
        const durationSeconds =
          (finishedAt.getTime() - startedAt.getTime()) / 1000;

        if (error) {
          resolve({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode: (error as any).code ?? 1,
            startedAt,
            finishedAt,
            durationSeconds,
          });
        } else {
          resolve({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode: 0,
            startedAt,
            finishedAt,
            durationSeconds,
          });
        }
      });
    });
  }
}
