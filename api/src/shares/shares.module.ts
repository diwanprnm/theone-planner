import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [ExpensesModule],
  controllers: [SharesController],
  providers: [SharesService],
})
export class SharesModule {}
