import { Module } from '@nestjs/common';
import { AutoActionController } from './auto-action.controller';
import { AutoActionService } from './auto-action.service';
import { CommandExecutorService } from './command-executor.service';

@Module({
  controllers: [AutoActionController],
  providers: [AutoActionService, CommandExecutorService],
})
export class AutoActionModule {}

