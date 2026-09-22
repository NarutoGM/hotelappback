import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status: 'online',
      message: 'Hotel PMS & Booking API is running smoothly',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
