import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@ApiTags('Acara')
@Authenticated()
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Buat acara' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateEventDto) {
    return this.events.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar acara milik pengguna' })
  findAll(@CurrentUser('id') userId: string, @Query() query: QueryEventsDto) {
    return this.events.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail acara beserta ringkasan anggaran' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.events.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Ubah acara' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Hapus acara beserta seluruh isinya' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.events.remove(userId, id);
  }
}
