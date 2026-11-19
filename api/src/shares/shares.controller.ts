import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SetSharesDto } from './dto/set-shares.dto';
import { SharesService } from './shares.service';

@ApiTags('Bagian')
@Authenticated()
@Controller('expenses/:expenseId/shares')
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Get()
  @ApiOperation({ summary: 'Lihat pembagian tersimpan beserta sisa belum terbagi' })
  preview(@CurrentUser('id') userId: string, @Param('expenseId') expenseId: string) {
    return this.shares.preview(userId, expenseId);
  }

  @Get('even')
  @ApiOperation({ summary: 'Pratinjau pembagian rata ke seluruh peserta' })
  evenPreview(@CurrentUser('id') userId: string, @Param('expenseId') expenseId: string) {
    return this.shares.evenPreview(userId, expenseId);
  }

  @Put()
  @ApiOperation({ summary: 'Ganti pembagian pengeluaran' })
  setShares(
    @CurrentUser('id') userId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: SetSharesDto,
  ) {
    return this.shares.setShares(userId, expenseId, dto.shares);
  }
}
