import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Laporan')
@Authenticated()
@Controller('events/:eventId/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan anggaran vs realisasi, plus surplus' })
  summary(@CurrentUser('id') userId: string, @Param('eventId') eventId: string) {
    return this.reports.summary(userId, eventId);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Pengeluaran per kategori' })
  byCategory(@CurrentUser('id') userId: string, @Param('eventId') eventId: string) {
    return this.reports.byCategory(userId, eventId);
  }

  @Get('talangan')
  @ApiOperation({
    summary: 'Rekap talangan per pembayar (tanpa menghitung utang bersih antar orang)',
  })
  talangan(@CurrentUser('id') userId: string, @Param('eventId') eventId: string) {
    return this.reports.talangan(userId, eventId);
  }
}
