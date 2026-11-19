import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProviderDto,
  UpdateProviderDto,
} from './dto/provider.dto';

const PROVIDER_SELECT = {
  id: true,
  name: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const providers = await this.prisma.provider.findMany({
      where: { userId },
      orderBy: [{ name: 'asc' }],
      select: {
        ...PROVIDER_SELECT,
        _count: { select: { debts: true, incomes: true } },
      },
    });

    return providers.map(({ _count, ...provider }) => ({
      ...provider,
      debtCount: _count.debts,
      incomeCount: _count.incomes,
    }));
  }

  async create(userId: string, dto: CreateProviderDto) {
    const name = dto.name.trim();

    await this.assertNameAvailable(userId, name);

    return this.prisma.provider.create({
      data: { userId, name, notes: dto.notes?.trim() || null },
      select: PROVIDER_SELECT,
    });
  }

  async update(userId: string, id: string, dto: UpdateProviderDto) {
    await this.findOwned(userId, id);

    const name = dto.name?.trim();

    if (name !== undefined) {
      await this.assertNameAvailable(userId, name, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.provider.update({
        where: { id },
        data: {
          name,
          notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
        },
        select: PROVIDER_SELECT,
      });

      if (name !== undefined) {
        // Deudas e ingresos guardan el nombre como texto: se mantiene sincronizado.
        await tx.debt.updateMany({
          where: { userId, providerId: id },
          data: { lender: name },
        });
        await tx.income.updateMany({
          where: { userId, providerId: id },
          data: { source: name },
        });
      }

      return updated;
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.prisma.provider.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Proveedor no encontrado');
    }
  }

  private async findOwned(userId: string, id: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    return provider;
  }

  private async assertNameAvailable(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.provider.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ya existe un proveedor con ese nombre');
    }
  }
}
