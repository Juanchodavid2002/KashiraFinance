import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  currency: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
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

  updateCurrency(id: string, currency: Currency) {
    return this.prisma.user.update({
      where: { id },
      data: { currency },
      select: USER_PUBLIC_SELECT,
    });
  }
}
