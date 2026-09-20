import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SearchRoomsQueryDto, CreateBookingDto } from './dto/rooms.dto.js';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filtra habitaciones disponibles por Capacidad mínima requerida
   * y por rango de fechas (sin solapamiento de reservas confirmadas/pendientes).
   */
  async searchRooms(query: SearchRoomsQueryDto) {
    const minCapacity = query.capacity ? Number(query.capacity) : 1;
    const { checkIn, checkOut } = query;

    // 1. Obtener habitaciones que soporten al menos la capacidad solicitada
    const rooms = await this.prisma.room.findMany({
      where: {
        isAvailable: true,
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
}

