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
import { ContributeEnvelopeDto } from './dto/contribute-envelope.dto';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { SpendEnvelopeDto } from './dto/spend-envelope.dto';
import { UpdateEnvelopeDto } from './dto/update-envelope.dto';
import { EnvelopesService } from './envelopes.service';

@Controller('envelopes')
export class EnvelopesController {
  constructor(private readonly envelopesService: EnvelopesService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.envelopesService.list(user.id);
  }

  @Get(':id/basic')
  getBasic(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.envelopesService.getById(user.id, id);
  }

  @Get(':id')
  getDetail(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.envelopesService.getDetail(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateEnvelopeDto) {
    return this.envelopesService.create(user.id, dto);
  }

  @Post(':id/contribute')
  contribute(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContributeEnvelopeDto,
  ) {
    return this.envelopesService.contribute(user.id, id, dto);
  }

  @Post(':id/spend')
  spend(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SpendEnvelopeDto,
  ) {
    return this.envelopesService.spend(user.id, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnvelopeDto,
  ) {
    return this.envelopesService.update(user.id, id, dto);
  }

  @Delete(':id/movements/:movementId')
  async removeMovement(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('movementId', ParseUUIDPipe) movementId: string,
  ): Promise<{ success: true }> {
    await this.envelopesService.removeMovement(user.id, id, movementId);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.envelopesService.remove(user.id, id);
    return { success: true };
  }
}