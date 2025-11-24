import { Module } from '@nestjs/common';
import { AutoActionModule } from './auto-action/auto-action.module';

@Module({
  imports: [AutoActionModule],
})
export class AppModule {}

