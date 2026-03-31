import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { IncidentsService } from './incidents.service';

@Controller()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get('dashboard')
  getDashboard(@Query('date') date?: string) {
    const selectedDate = date ?? new Date().toISOString().slice(0, 10);
    return this.incidentsService.getDashboard(selectedDate);
  }

  @Post('incidents')
  create(@Body() body: CreateIncidentDto) {
    return this.incidentsService.create(body);
  }

  @Post('incidents/:id/pay')
  pay(@Param('id', ParseIntPipe) id: number) {
    return this.incidentsService.pay(id);
  }
}
