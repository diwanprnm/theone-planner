import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BudgetItemsService } from './budget-items.service';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';

@ApiTags('Item Anggaran')
@Authenticated()
@Controller()
export class BudgetItemsController {
  constructor(private readonly items: BudgetItemsService) {}

  @Post('activities/:activityId/budget-items')
  @ApiOperation({ summary: 'Tambah item anggaran ke kegiatan' })
  create(
    @CurrentUser('id') userId: string,
    @Param('activityId') activityId: string,
    @Body() dto: CreateBudgetItemDto,
  ) {
    return this.items.create(userId, activityId, dto);
  }

  @Get('activities/:activityId/budget-items')
  @ApiOperation({ summary: 'Daftar item anggaran dalam kegiatan' })
  findAll(@CurrentUser('id') userId: string, @Param('activityId') activityId: string) {
    return this.items.findAll(userId, activityId);
  }

  @Get('budget-items/:id')
  @ApiOperation({ summary: 'Detail item anggaran beserta realisasinya' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.items.findOne(userId, id);
  }

  @Patch('budget-items/:id')
  @ApiOperation({ summary: 'Ubah item anggaran' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetItemDto,
  ) {
    return this.items.update(userId, id, dto);
  }

  @Delete('budget-items/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Hapus item anggaran' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.items.remove(userId, id);
  }
}
