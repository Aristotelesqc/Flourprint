import { MemoryBakeEventStore, MemoryRecipeRepository } from '../src/memory/index.js';
import {
  describeBakeEventStoreContract,
  describeRecipeRepositoryContract,
} from './contract/stores.js';

describeBakeEventStoreContract('memory', () => new MemoryBakeEventStore());
describeRecipeRepositoryContract('memory', () => new MemoryRecipeRepository());
