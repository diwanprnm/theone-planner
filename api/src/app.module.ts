import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountModule } from './account/account.module';
import { ActivitiesModule } from './activities/activities.module';
import { BudgetItemsModule } from './budget-items/budget-items.module';
import { CategoriesModule } from './categories/categories.module';
import { EventsModule } from './events/events.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HealthModule } from './health/health.module';
import { ParticipantsModule } from './participants/participants.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReportsModule } from './reports/reports.module';
import { SharesModule } from './shares/shares.module';
import { SupabaseModule } from './supabase/supabase.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    SupabaseModule,
    EventsModule,
    ActivitiesModule,
    BudgetItemsModule,
    ExpensesModule,
    ParticipantsModule,
    SharesModule,
    CategoriesModule,
    ReportsModule,
    ReceiptsModule,
    HealthModule,
    AccountModule,
  ],
})
export class AppModule {}
