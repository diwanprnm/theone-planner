import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Pengeluaran')
@Authenticated()
@Controller()
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post('activities/:activityId/expenses')
  @ApiOperation({ summary: 'Catat pengeluaran (bagi rata bila shares dikosongkan)' })
  create(
    @CurrentUser('id') userId: string,
    @Param('activityId') activityId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenses.create(userId, activityId, dto);
  }

  @Get('activities/:activityId/expenses')
  @ApiOperation({ summary: 'Daftar pengeluaran dalam kegiatan' })
  findAll(@CurrentUser('id') userId: string, @Param('activityId') activityId: string) {
    return this.expenses.findAll(userId, activityId);
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Detail pengeluaran beserta pembagiannya' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.expenses.findOne(userId, id);
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: 'Ubah pengeluaran' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(userId, id, dto);
  }

  @Delete('expenses/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Hapus pengeluaran beserta pembagiannya' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.expenses.remove(userId, id);
  }
}
