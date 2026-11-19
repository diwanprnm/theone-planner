import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { BudgetItemsController } from './budget-items.controller';
import { BudgetItemsService } from './budget-items.service';

@Module({
  imports: [ActivitiesModule],
  controllers: [BudgetItemsController],
  providers: [BudgetItemsService],
  exports: [BudgetItemsService],
})
export class BudgetItemsModule {}
