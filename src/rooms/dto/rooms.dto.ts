export interface SearchRoomsQueryDto {
  capacity?: number;
  checkIn?: string;  // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
}

export interface CalendarRoomsQueryDto {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface CreateBookingDto {
  roomId: string;
  userId?: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;  // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  guestsCount: number;
  totalAmount: number;
  status?: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN';
}

export interface CreateRoomDto {
  id?: string;
  roomNumber: string;
  title: string;
  subtitle?: string;
  type: string;
  floor: number;
  capacity?: number;
  pricePerNight: number;
  isAvailable?: boolean;
  bedType?: string;
  surfaceAreaM2?: number;
  amenitiesCsv?: string;
}

export interface UpdateRoomDto {
  roomNumber?: string;
  title?: string;
  subtitle?: string;
  type?: string;
  floor?: number;
  capacity?: number;
  pricePerNight?: number;
  isAvailable?: boolean;
  bedType?: string;
  surfaceAreaM2?: number;
  amenitiesCsv?: string;
}

export interface ToggleRoomAvailabilityDto {
  isAvailable?: boolean;
}

