import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Sehat')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Cek aplikasi hidup — tidak butuh autentikasi' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
