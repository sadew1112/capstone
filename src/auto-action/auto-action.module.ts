import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AutoActionController } from './auto-action.controller';
import { AutoActionService } from './auto-action.service';
import { CommandExecutorService } from './command-executor.service';

@Module({
  imports: [HttpModule],
  controllers: [AutoActionController],
  providers: [AutoActionService, CommandExecutorService],
})
export class AutoActionModule {}


