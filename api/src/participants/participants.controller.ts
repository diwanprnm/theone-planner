import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ReplaceParticipantsDto } from './dto/replace-participants.dto';
import { ParticipantsService } from './participants.service';

@ApiTags('Peserta')
@Authenticated()
@Controller()
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Post('events/:eventId/participants')
  @ApiOperation({ summary: 'Tambah satu peserta' })
  create(
    @CurrentUser('id') userId: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateParticipantDto,
  ) {
    return this.participants.create(userId, eventId, dto);
  }

  @Get('events/:eventId/participants')
  @ApiOperation({ summary: 'Daftar peserta sebuah acara' })
  findAll(@CurrentUser('id') userId: string, @Param('eventId') eventId: string) {
    return this.participants.findAll(userId, eventId);
  }

  @Put('events/:eventId/participants')
  @ApiOperation({ summary: 'Ganti seluruh daftar peserta sekaligus' })
  replaceAll(
    @CurrentUser('id') userId: string,
    @Param('eventId') eventId: string,
    @Body() dto: ReplaceParticipantsDto,
  ) {
    return this.participants.replaceAll(userId, eventId, dto);
  }

  @Delete('participants/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Hapus peserta' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.participants.remove(userId, id);
  }
}
