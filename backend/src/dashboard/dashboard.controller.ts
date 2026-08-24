import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  summary(
    @CurrentUser() user: { id: string },
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getSummary(user.id, query);
  }
}
