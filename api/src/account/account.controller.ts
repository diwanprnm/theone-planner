import { Controller, Delete, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccountService } from './account.service';

@ApiTags('Akun')
@Authenticated()
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Hapus akun sendiri beserta seluruh acara, kegiatan, dan pengeluaran',
  })
  remove(@CurrentUser('id') userId: string) {
    return this.account.deleteAccount(userId);
  }
}
