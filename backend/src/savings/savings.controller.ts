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
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSavingsDto } from './dto/create-savings.dto';
import { UpdateSavingsDto } from './dto/update-savings.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { QuerySavingsDto } from './dto/query-savings.dto';
import { SavingsService } from './savings.service';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query() query: QuerySavingsDto,
  ) {
    return this.savingsService.list(user.id, query);
  }

  @Get('total')
  total(@CurrentUser() user: { id: string }) {
    return this.savingsService.totalBalance(user.id);
  }

  @Get(':id')
  getDetail(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.savingsService.getById(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSavingsDto,
  ) {
    return this.savingsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavingsDto,
  ) {
    return this.savingsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.savingsService.remove(user.id, id);
  }

  @Post(':id/deposit')
  deposit(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DepositDto,
  ) {
    return this.savingsService.deposit(user.id, id, dto);
  }

  @Post(':id/withdraw')
  withdraw(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawDto,
  ) {
    return this.savingsService.withdraw(user.id, id, dto);
  }

  @Delete(':id/movements/:movementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMovement(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('movementId', ParseUUIDPipe) movementId: string,
  ) {
    return this.savingsService.removeMovement(user.id, id, movementId);
  }
}
