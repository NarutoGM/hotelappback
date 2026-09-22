import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../common/firebase.config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('base64');
  }

  private generateSalt(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email?.trim().toLowerCase();
    const password = loginDto.password;

    if (!email || !password) {
      throw new BadRequestException('Email y contraseña son requeridos');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('No existe una cuenta con este correo electrónico.');
    }

    const computedHash = this.hashPassword(password, user.salt);
    if (computedHash !== user.passwordHash) {
      throw new UnauthorizedException('Contraseña incorrecta. Por favor intenta de nuevo.');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      documentNumber: user.documentNumber,
      phone: (user as any).phone || 'No registrado',
      avatarUrl: (user as any).avatarUrl || null,
      role: user.role,
      createdAt: user.createdAt.getTime(),
    };
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email?.trim().toLowerCase();
    const { password, fullName, documentNumber, phone, role } = registerDto;

    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new BadRequestException('Formato de correo electrónico inválido.');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    }
    if (!fullName || fullName.trim().length === 0) {
      throw new BadRequestException('Por favor ingresa tu nombre completo.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo.');
    }

    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt);

    const userRole = role === 'ADMIN' ? 'ADMIN' : role === 'RECEPTIONIST' ? 'RECEPTIONIST' : 'GUEST';

    const newUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        salt,
        fullName: fullName.trim(),
        documentNumber: (documentNumber && documentNumber.trim()) || 'N/A',
        phone: (phone && phone.trim()) || 'No registrado',
        role: userRole,
      } as any,
    });

    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      documentNumber: newUser.documentNumber,
      phone: (newUser as any).phone || 'No registrado',
      avatarUrl: (newUser as any).avatarUrl || null,
      role: newUser.role,
      createdAt: newUser.createdAt.getTime(),
    };
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        documentNumber: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u: any) => ({
      ...u,
      createdAt: u.createdAt.getTime(),
    }));
  }

  async uploadAvatar(userId: string, fileBuffer: Buffer, mimeType: string, originalName: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      const extension = originalName?.split('.')?.pop() || 'jpg';
      const filename = `avatars/${user.id}_${Date.now()}.${extension}`;
      const storageRef = ref(storage, filename);

      const bufferData = new Uint8Array(fileBuffer);
      await uploadBytes(storageRef, bufferData, { contentType: mimeType || 'image/jpeg' });
      const downloadUrl = await getDownloadURL(storageRef);

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: downloadUrl,
        } as any,
      });

      return {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        documentNumber: updated.documentNumber,
        phone: (updated as any).phone || 'No registrado',
        avatarUrl: (updated as any).avatarUrl || null,
        role: updated.role,
        createdAt: updated.createdAt.getTime(),
      };
    } catch (err: any) {
      console.error('[UploadAvatar ERROR]', err);
      throw new BadRequestException(`Error al subir foto de perfil: ${err?.message || err}`);
    }
  }

  async updateProfile(userId: string, data: { fullName?: string; phone?: string; documentNumber?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
        ...(data.phone ? { phone: data.phone.trim() } : {}),
        ...(data.documentNumber ? { documentNumber: data.documentNumber.trim() } : {}),
      } as any,
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      documentNumber: updated.documentNumber,
      phone: (updated as any).phone || 'No registrado',
      avatarUrl: (updated as any).avatarUrl || null,
      role: updated.role,
      createdAt: updated.createdAt.getTime(),
    };
  }
}
