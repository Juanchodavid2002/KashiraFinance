import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.usersService.findPublicById(user.id);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateCurrency(user.id, dto.currency);
  }
}
