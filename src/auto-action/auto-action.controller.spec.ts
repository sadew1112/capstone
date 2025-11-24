import { Test, TestingModule } from '@nestjs/testing';
import { AutoActionController } from './auto-action.controller';

describe('AutoActionController', () => {
  let controller: AutoActionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutoActionController],
    }).compile();

    controller = module.get<AutoActionController>(AutoActionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
