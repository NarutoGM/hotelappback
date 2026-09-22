import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RoomsModule } from './rooms/rooms.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule, RoomsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
