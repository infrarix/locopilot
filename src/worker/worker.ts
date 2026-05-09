'use strict';

import { executeJob } from './executor';
import { PartialTrainingConfig } from '../training/types';

export class BasicWorker {
  async executeJob(jobId: string, config: PartialTrainingConfig): Promise<void> {
    return executeJob(jobId, config);
  }
}

export { executeJob };
