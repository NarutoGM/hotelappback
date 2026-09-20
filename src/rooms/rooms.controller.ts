import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import type { CreateBookingDto } from './dto/rooms.dto.js';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /**
   * GET /rooms?capacity=2&checkIn=2026-09-20&checkOut=2026-09-24
   * Búsqueda limpia y directa de habitaciones por Capacidad y Fechas
   */
  @Get()
  async searchRooms(
    @Query('capacity') capacity?: string,
    @Query('checkIn') checkIn?: string,
    @Query('checkOut') checkOut?: string,
  ) {
    return this.roomsService.searchRooms({
      capacity: capacity ? parseInt(capacity, 10) : undefined,
      checkIn,
      checkOut,
    });
  }

  /**
   * GET /rooms/calendar?startDate=2026-09-20&endDate=2026-10-20
   * Vista de Calendario / Matriz para Recepción
   */
  @Get('calendar')
  async getCalendarRooms(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.roomsService.getCalendarRooms({ startDate, endDate });
  }

  @Get(':id')
  async getRoomById(@Param('id') id: string) {
    return this.roomsService.getRoomById(id);
  }


  @Post('book')
  async createBooking(@Body() dto: CreateBookingDto) {
    return this.roomsService.createBooking(dto);
  }

  @Get('bookings/all')
  async getBookings(@Query('userId') userId?: string) {
    return this.roomsService.getBookings(userId);
  }
}
