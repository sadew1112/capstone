import { Test, TestingModule } from '@nestjs/testing';
import { AutoActionService } from './auto-action.service';

describe('AutoActionService', () => {
  let service: AutoActionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutoActionService],
    }).compile();

    service = module.get<AutoActionService>(AutoActionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
