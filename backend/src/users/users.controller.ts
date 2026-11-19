import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/account.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.usersService.findPublicById(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateCurrency(user.id, dto.currency);
  }
}
