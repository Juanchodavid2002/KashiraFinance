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
import { BudgetsService } from './budgets.service';
import {
  CreateBudgetDto,
  CreateBudgetLineDto,
  UpdateBudgetDto,
  UpdateBudgetLineDto,
} from './dto/budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.budgetsService.list(user.id);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.getById(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.remove(user.id, id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicate(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.duplicate(user.id, id);
  }

  @Post(':id/lines')
  @HttpCode(HttpStatus.CREATED)
  addLine(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetLineDto,
  ) {
    return this.budgetsService.addLine(user.id, id, dto);
  }

  @Patch(':id/lines/:lineId')
  updateLine(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateBudgetLineDto,
  ) {
    return this.budgetsService.updateLine(user.id, id, lineId, dto);
  }

  @Delete(':id/lines/:lineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLine(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    return this.budgetsService.removeLine(user.id, id, lineId);
  }
}
