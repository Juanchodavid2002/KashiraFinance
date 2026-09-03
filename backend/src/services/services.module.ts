import { Module } from '@nestjs/common';
import { EnvelopesModule } from '../envelopes/envelopes.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [EnvelopesModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}