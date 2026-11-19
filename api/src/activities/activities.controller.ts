import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('Kegiatan')
@Authenticated()
@Controller()
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Post('events/:eventId/activities')
  @ApiOperation({ summary: 'Tambah kegiatan ke acara' })
  create(
    @CurrentUser('id') userId: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activities.create(userId, eventId, dto);
  }

  @Get('events/:eventId/activities')
  @ApiOperation({ summary: 'Daftar kegiatan dalam acara, urut sesuai itinerary' })
  findAll(@CurrentUser('id') userId: string, @Param('eventId') eventId: string) {
    return this.activities.findAll(userId, eventId);
  }

  @Get('activities/:id')
  @ApiOperation({ summary: 'Detail kegiatan beserta anggaran dan realisasinya' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.activities.findOne(userId, id);
  }

  @Patch('activities/:id')
  @ApiOperation({ summary: 'Ubah kegiatan' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activities.update(userId, id, dto);
  }

  @Delete('activities/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Hapus kegiatan beserta item anggaran dan pengeluarannya' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.activities.remove(userId, id);
  }
}
