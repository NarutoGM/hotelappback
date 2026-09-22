import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoomsService } from './rooms.service.js';
import type { CreateBookingDto, CreateRoomDto, UpdateRoomDto, ToggleRoomAvailabilityDto, ToggleMaintenanceDto } from './dto/rooms.dto.js';

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
   * PATCH /rooms/:id/maintenance
   * Alternar estado de mantenimiento de una habitación (Admin / Recepción)
   */
  @Patch(':id/maintenance')
  async toggleRoomMaintenance(
    @Param('id') id: string,
    @Body() dto?: ToggleMaintenanceDto,
  ) {
    return this.roomsService.toggleRoomMaintenance(id, dto?.isUnderMaintenance);
  }

  /**
   * PATCH /rooms/:id
   * Actualizar campos de una habitación (Admin / Recepción)
   */
  @Patch(':id')
  async updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.updateRoom(id, dto);
  }

  /**
   * POST /rooms/:id/image
   * Sube una imagen a Firebase Storage para la habitación y actualiza su imageUrl
   */
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRoomImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Debe proporcionar un archivo de imagen en el campo "file".');
    }
    return this.roomsService.uploadRoomImage(
      id,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  /**
   * DELETE /rooms/:id
   * Elimina una habitación (Solo si está inhabilitada y sin reservas activas)
   */
  @Delete(':id')
  async deleteRoom(@Param('id') id: string) {
    return this.roomsService.deleteRoom(id);
  }

  @Post('book')
  async createBooking(@Body() dto: CreateBookingDto) {
    return this.roomsService.createBooking(dto);
  }

  @Get('bookings/all')
  async getBookings(@Query('userId') userId?: string) {
    return this.roomsService.getBookings(userId);
  }

  /**
   * POST /rooms/bookings/:id/voucher
   * Sube la captura del voucher a Firebase Storage para una reserva
   */
  @Post('bookings/:id/voucher')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBookingVoucher(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Debe proporcionar un archivo de imagen en el campo "file".');
    }
    return this.roomsService.uploadBookingVoucher(
      id,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  /**
   * DELETE /rooms/bookings/:id/voucher
   * Elimina un comprobante específico (antes del envío definitivo)
   */
  @Delete('bookings/:id/voucher')
  async deleteBookingVoucher(
    @Param('id') id: string,
    @Query('index') index?: string,
  ) {
    const idx = index !== undefined ? parseInt(index, 10) : 0;
    return this.roomsService.deleteBookingVoucher(id, isNaN(idx) ? 0 : idx);
  }

  /**
   * POST /rooms/bookings/:id/submit-voucher
   * Confirma y bloquea los comprobantes adjuntos
   */
  @Post('bookings/:id/submit-voucher')
  async submitBookingVouchers(@Param('id') id: string) {
    return this.roomsService.submitBookingVouchers(id);
  }

  /**
   * PATCH /rooms/bookings/:id/status
   */
  @Patch('bookings/:id/status')
  async updateBookingStatus(
    @Param('id') id: string,
    @Body('status') status: any,
  ) {
    return this.roomsService.updateBookingStatus(id, status);
  }
}


