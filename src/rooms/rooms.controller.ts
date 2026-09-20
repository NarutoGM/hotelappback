import { Controller, Get, Post, Patch, Body, Query, Param } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import type { CreateBookingDto, CreateRoomDto, UpdateRoomDto, ToggleRoomAvailabilityDto } from './dto/rooms.dto.js';

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
   * GET /rooms/all
   * Lista todas las habitaciones del hotel con su estado (para Admin / Recepción)
   */
  @Get('admin/all')
  async getAllRoomsForAdmin() {
    return this.roomsService.getAllRoomsForAdmin();
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

  /**
   * POST /rooms
   * Crear una nueva habitación (Admin / Recepción)
   */
  @Post()
  async createRoom(@Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(dto);
  }

  /**
   * PATCH /rooms/:id/toggle
   * Activar o desactivar una habitación (Admin / Recepción)
   * Body opcional: { "isAvailable": true | false } (si no se envía, invierte el estado)
   */
  @Patch(':id/toggle')
  async toggleRoomAvailability(
    @Param('id') id: string,
    @Body() dto?: ToggleRoomAvailabilityDto,
  ) {
    return this.roomsService.toggleRoomAvailability(id, dto?.isAvailable);
  }

  /**
   * PATCH /rooms/:id
   * Actualizar campos de una habitación (Admin / Recepción)
   */
  @Patch(':id')
  async updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.updateRoom(id, dto);
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

