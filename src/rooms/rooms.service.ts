import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../common/firebase.config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SearchRoomsQueryDto, CreateBookingDto, CreateRoomDto, UpdateRoomDto } from './dto/rooms.dto.js';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Expira automáticamente reservas pendientes sin comprobante enviado tras 15 minutos
   */
  async expireStalePendingBookings() {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const expired = await this.prisma.booking.updateMany({
        where: {
          status: 'PENDING',
          voucherSubmitted: false,
          createdAt: {
            lt: fifteenMinutesAgo,
          },
        },
        data: {
          status: 'CANCELLED',
        },
      });

      if (expired.count > 0) {
        console.log(`[AutoExpire] Se cancelaron ${expired.count} reserva(s) por exceder los 15 minutos de plazo de pago.`);
      }
    } catch (err) {
      console.error('[AutoExpire Error]', err);
    }
  }

  /**
   * Cron job que se ejecuta cada minuto en segundo plano
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCronExpiration() {
    await this.expireStalePendingBookings();
  }

  /**
   * Filtra habitaciones disponibles por Capacidad mínima requerida
   * y por rango de fechas (sin solapamiento de reservas confirmadas/pendientes).
   */
  async searchRooms(query: SearchRoomsQueryDto) {
    await this.expireStalePendingBookings();
    const minCapacity = query.capacity ? Number(query.capacity) : 1;
    const { checkIn, checkOut } = query;

    // 1. Obtener habitaciones que soporten al menos la capacidad solicitada
    const rooms = await this.prisma.room.findMany({
      where: {
        isAvailable: true,
        isUnderMaintenance: false,
        capacity: {
          gte: minCapacity,
        },
      },
      include: {
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'],
            },
          },
        },
      },
      orderBy: {
        pricePerNight: 'asc',
      },
    });

    // 2. Si se pasaron fechas, filtrar habitaciones que NO tengan conflicto de solapamiento
    if (checkIn && checkOut) {
      const filtered = rooms.filter((room) => {
        const hasConflict = room.bookings.some((b) => {
          // Conflicto si: nueva.checkIn < reserva.checkOut && nueva.checkOut > reserva.checkIn
          return checkIn < b.checkOutDate && checkOut > b.checkInDate;
        });
        return !hasConflict;
      });

      return filtered.map(({ bookings, ...roomData }) => roomData);
    }

    return rooms.map(({ bookings, ...roomData }) => roomData);
  }

  /**
   * Obtiene el detalle de una habitación específica
   */
  async getRoomById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });
    if (!room) {
      throw new BadRequestException('Habitación no encontrada');
    }
    return room;
  }

  /**
   * Crea una reserva atómica con validación de capacidad y fechas
   */
  async createBooking(dto: CreateBookingDto) {
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });
    if (!room) {
      throw new BadRequestException('La habitación solicitada no existe.');
    }

    if (dto.guestsCount > room.capacity) {
      throw new BadRequestException(
        `La habitación ${room.title} solo admite hasta ${room.capacity} personas.`,
      );
    }

    // Comprobar conflicto de fechas
    const conflicting = await this.prisma.booking.findFirst({
      where: {
        roomId: dto.roomId,
        status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
        AND: [
          { checkInDate: { lt: dto.checkOutDate } },
          { checkOutDate: { gt: dto.checkInDate } },
        ],
      },
    });

    if (conflicting) {
      throw new ConflictException(
        'Esta habitación ya está reservada para las fechas seleccionadas.',
      );
    }

    const bookingId = `AG-${Math.floor(10000 + Math.random() * 90000)}`;

    const newBooking = await this.prisma.booking.create({
      data: {
        bookingId,
        roomId: dto.roomId,
        userId: dto.userId || null,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        checkInDate: dto.checkInDate,
        checkOutDate: dto.checkOutDate,
        nights: Math.max(1, Math.round((new Date(dto.checkOutDate).getTime() - new Date(dto.checkInDate).getTime()) / (1000 * 60 * 60 * 24)) || 1),
        guestsCount: dto.guestsCount,
        totalAmount: dto.totalAmount,
        status: dto.status || 'PENDING',
      },
    });

    return newBooking;
  }

  /**
   * Vista de Calendario / Matriz para Recepción:
   * Devuelve todas las habitaciones junto a sus reservas comprendidas en el rango de fechas.
   */
  async getCalendarRooms(query: { startDate?: string; endDate?: string }) {
    // Si no se especifican fechas, usar los próximos 30 días
    const today = new Date().toISOString().split('T')[0];
    const defaultEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = query.startDate || today;
    const endDate = query.endDate || defaultEnd;

    const rooms = await this.prisma.room.findMany({
      orderBy: [
        { floor: 'asc' },
        { roomNumber: 'asc' },
      ],
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
            AND: [
              { checkInDate: { lt: endDate } },
              { checkOutDate: { gt: startDate } },
            ],
          },
          select: {
            id: true,
            bookingId: true,
            guestName: true,
            guestEmail: true,
            checkInDate: true,
            checkOutDate: true,
            nights: true,
            guestsCount: true,
            status: true,
            totalAmount: true,
            voucherFileName: true,
            voucherSubmitted: true,
            voucherSecurityCode: true,
          },
          orderBy: {
            checkInDate: 'asc',
          },
        },
      },
    });

    return rooms;
  }

  /**
   * Listar todas las reservas del sistema (para recepción o huésped)
   */
  async getBookings(userId?: string) {
    await this.expireStalePendingBookings();
    return this.prisma.booking.findMany({
      where: userId ? { userId } : undefined,
      include: {
        room: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Crear una nueva habitación (Admin / Recepción)
   */
  async createRoom(dto: CreateRoomDto) {
    const id = dto.id || `RM-${dto.roomNumber}`;

    const existing = await this.prisma.room.findUnique({
      where: { id },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una habitación con ID o número ${id}`);
    }

    return this.prisma.room.create({
      data: {
        id,
        roomNumber: dto.roomNumber,
        title: dto.title,
        type: dto.type,
        floor: dto.floor,
        capacity: dto.capacity || 2,
        pricePerNight: dto.pricePerNight,
        isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : true,
        isUnderMaintenance: dto.isUnderMaintenance !== undefined ? dto.isUnderMaintenance : false,
        bedType: dto.bedType || '1 Cama Queen',
        surfaceAreaM2: dto.surfaceAreaM2 || 28,
        imageUrl: dto.imageUrl || null,
      },
    });
  }

  /**
   * Activar o desactivar una habitación (Admin / Recepción)
   * Si no se envía isAvailable en el body, simplemente invierte el estado actual (toggle).
   */
  async toggleRoomAvailability(id: string, isAvailable?: boolean) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new BadRequestException(`Habitación con ID ${id} no encontrada.`);
    }

    const nextState = isAvailable !== undefined ? isAvailable : !room.isAvailable;

    return this.prisma.room.update({
      where: { id },
      data: { isAvailable: nextState },
    });
  }

  /**
   * Alternar estado de Mantenimiento de una habitación (Admin / Recepción)
   */
  async toggleRoomMaintenance(id: string, isUnderMaintenance?: boolean) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new BadRequestException(`Habitación con ID ${id} no encontrada.`);
    }

    const nextState =
      isUnderMaintenance !== undefined ? isUnderMaintenance : !room.isUnderMaintenance;

    return this.prisma.room.update({
      where: { id },
      data: { isUnderMaintenance: nextState },
    });
  }

  /**
   * Modificar datos de una habitación (Admin / Recepción)
   */
  async updateRoom(id: string, dto: UpdateRoomDto) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new BadRequestException(`Habitación con ID ${id} no encontrada.`);
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  /**
   * Listar todas las habitaciones sin filtros (para gestión de administración/recepción)
   */
  async getAllRoomsForAdmin() {
    return this.prisma.room.findMany({
      orderBy: [
        { floor: 'asc' },
        { roomNumber: 'asc' },
      ],
    });
  }

  /**
   * Eliminar una habitación.
   * Regla de negocio: Solo se permite eliminar si la habitación está inhabilitada (isAvailable === false).
   */
  async deleteRoom(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
          },
        },
      },
    });

    if (!room) {
      throw new BadRequestException(`Habitación con ID ${id} no encontrada.`);
    }

    if (room.isAvailable) {
      throw new BadRequestException(
        'No se puede eliminar una habitación activa. Debe inhabilitarla/desactivarla primero.'
      );
    }

    if (room.bookings.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar la habitación porque tiene ${room.bookings.length} reserva(s) activa(s).`
      );
    }

    await this.prisma.booking.deleteMany({
      where: { roomId: id },
    });

    return this.prisma.room.delete({
      where: { id },
    });
  }

  /**
   * Sube una imagen a Firebase Storage y actualiza la URL en la habitación
   */
  async uploadRoomImage(id: string, fileBuffer: Buffer, mimeType: string, originalName: string) {
    try {
      console.log(`[UploadRoomImage] Iniciando subida para room ID: ${id}, archivo: ${originalName}, mime: ${mimeType}, size: ${fileBuffer?.length} bytes`);
      
      const room = await this.prisma.room.findUnique({
        where: { id },
      });

      if (!room) {
        throw new BadRequestException(`Habitación con ID ${id} no encontrada.`);
      }

      const extension = originalName?.split('.')?.pop() || 'jpg';
      const filename = `rooms/${id}_${Date.now()}.${extension}`;
      console.log(`[UploadRoomImage] Generando referencia en Firebase: ${filename}`);
      const storageRef = ref(storage, filename);

      const bufferData = new Uint8Array(fileBuffer);
      console.log(`[UploadRoomImage] Subiendo bytes a Firebase Storage...`);
      const uploadResult = await uploadBytes(storageRef, bufferData, { contentType: mimeType || 'image/jpeg' });
      console.log(`[UploadRoomImage] Upload exitoso, obteniendo download URL...`, uploadResult.metadata?.fullPath);
      
      const downloadUrl = await getDownloadURL(storageRef);
      console.log(`[UploadRoomImage] URL obtenida: ${downloadUrl}`);

      const updated = await this.prisma.room.update({
        where: { id },
        data: { imageUrl: downloadUrl },
      });
      console.log(`[UploadRoomImage] Habitación actualizada exitosamente en BD.`);
      return updated;
    } catch (err: any) {
      console.error(`[UploadRoomImage ERROR] Error subiendo imagen a Firebase:`, err);
      throw new BadRequestException(`Error en Firebase Storage: ${err?.message || err}`);
    }
  }

  /**
   * Sube la captura del voucher de pago a Firebase Storage y actualiza la reserva
   */
  async uploadBookingVoucher(id: string, fileBuffer: Buffer, mimeType: string, originalName: string) {
    try {
      console.log(`[UploadVoucher] Iniciando subida voucher para booking ID: ${id}, archivo: ${originalName}, size: ${fileBuffer?.length} bytes`);

      const booking = await this.prisma.booking.findFirst({
        where: {
          OR: [
            { id },
            { bookingId: id },
          ],
        },
      });

      if (!booking) {
        throw new BadRequestException(`Reserva con ID ${id} no encontrada.`);
      }

      if (booking.voucherSubmitted) {
        throw new BadRequestException('Los comprobantes ya fueron enviados y no se pueden modificar.');
      }

      const extension = originalName?.split('.')?.pop() || 'jpg';
      const filename = `vouchers/${booking.bookingId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
      console.log(`[UploadVoucher] Generando referencia en Firebase: ${filename}`);
      const storageRef = ref(storage, filename);

      const bufferData = new Uint8Array(fileBuffer);
      await uploadBytes(storageRef, bufferData, { contentType: mimeType || 'image/jpeg' });
      const downloadUrl = await getDownloadURL(storageRef);
      console.log(`[UploadVoucher] URL obtenida: ${downloadUrl}`);

      const existingVouchers = booking.voucherFileName
        ? booking.voucherFileName.split(',').map((v) => v.trim()).filter(Boolean)
        : [];

      const newVouchers = existingVouchers.length < 2
        ? [...existingVouchers, downloadUrl]
        : [existingVouchers[0], downloadUrl];

      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          voucherFileName: newVouchers.join(','),
          status: 'PENDING',
        },
        include: {
          room: true,
        },
      });
      console.log(`[UploadVoucher] Reserva actualizada exitosamente con ${newVouchers.length} voucher(s).`);
      return updated;
    } catch (err: any) {
      console.error(`[UploadVoucher ERROR] Error subiendo voucher a Firebase:`, err);
      throw new BadRequestException(`Error en Firebase Storage: ${err?.message || err}`);
    }
  }

  /**
   * Elimina un voucher específico de la reserva (antes de ser enviado)
   */
  async deleteBookingVoucher(id: string, index: number) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [{ id }, { bookingId: id }],
      },
    });

    if (!booking) {
      throw new BadRequestException(`Reserva no encontrada.`);
    }

    if (booking.voucherSubmitted) {
      throw new BadRequestException('El comprobante ya fue enviado y no puede ser eliminado.');
    }

    const existingVouchers = booking.voucherFileName
      ? booking.voucherFileName.split(',').map((v) => v.trim()).filter(Boolean)
      : [];

    if (index >= 0 && index < existingVouchers.length) {
      existingVouchers.splice(index, 1);
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        voucherFileName: existingVouchers.length > 0 ? existingVouchers.join(',') : null,
      },
      include: {
        room: true,
      },
    });
    return updated;
  }

  /**
   * Bloquea y confirma el envío de los comprobantes adjuntos
   */
  async submitBookingVouchers(id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [{ id }, { bookingId: id }],
      },
    });

    if (!booking) {
      throw new BadRequestException(`Reserva no encontrada.`);
    }

    if (!booking.voucherFileName) {
      throw new BadRequestException('Debes adjuntar al menos un comprobante antes de enviar.');
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        voucherSubmitted: true,
        status: 'PENDING',
      },
      include: {
        room: true,
      },
    });
    return updated;
  }

  /**
   * Actualiza el estado de una reserva (CONFIRMED, REJECTED, CHECKED_IN, CHECKED_OUT, CANCELLED)
   */
  async updateBookingStatus(id: string, status: any) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [
          { id },
          { bookingId: id },
        ],
      },
    });

    if (!booking) {
      throw new BadRequestException(`Reserva no encontrada.`);
    }

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status },
      include: {
        room: true,
      },
    });
  }

  /**
   * Actualiza los datos del huésped o de la reserva (guestName, guestEmail, guestsCount, status)
   */
  async updateBookingDetails(id: string, dto: { guestName?: string; guestEmail?: string; guestsCount?: number; status?: any }) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [
          { id },
          { bookingId: id },
        ],
      },
      include: { room: true },
    });

    if (!booking) {
      throw new BadRequestException(`Reserva con ID ${id} no encontrada.`);
    }

    if (dto.guestsCount && booking.room && dto.guestsCount > booking.room.capacity) {
      throw new BadRequestException(`La capacidad máxima de la habitación es de ${booking.room.capacity} personas.`);
    }

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        ...(dto.guestName ? { guestName: dto.guestName.trim() } : {}),
        ...(dto.guestEmail ? { guestEmail: dto.guestEmail.trim() } : {}),
        ...(dto.guestsCount ? { guestsCount: dto.guestsCount } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        room: true,
      },
    });
  }
}


