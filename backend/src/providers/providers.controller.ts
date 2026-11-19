import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateProviderDto,
  UpdateProviderDto,
} from './dto/provider.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.service.list(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProviderDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
