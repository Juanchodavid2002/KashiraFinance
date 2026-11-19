import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  currency: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findByIdentifier(identifier: string) {
    const value = identifier.trim().toLowerCase();

    return value.includes('@')
      ? this.findByEmail(value)
      : this.findByUsername(value);
  }

  findPublicById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });
  }

  create(data: {
    name: string;
    email: string;
    username?: string;
    passwordHash: string;
    currency?: Currency;
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        currency: data.currency ?? Currency.COP,
      },
      select: USER_PUBLIC_SELECT,
    });
  }

  async updateProfile(
    id: string,
    dto: { name?: string; username?: string },
  ) {
    const username = dto.username?.trim().toLowerCase();

    if (username) {
      const taken = await this.prisma.user.findFirst({
        where: { username, id: { not: id } },
        select: { id: true },
      });

      if (taken) {
        throw new ConflictException('El usuario ya está en uso');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { name: dto.name?.trim(), username },
      select: USER_PUBLIC_SELECT,
    });
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { passwordHash: true },
    });

    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta a la actual',
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });

    return { message: 'Contraseña actualizada correctamente.' };
  }

  updateCurrency(id: string, currency: Currency) {
    return this.prisma.user.update({
      where: { id },
      data: { currency },
      select: USER_PUBLIC_SELECT,
    });
  }
}
