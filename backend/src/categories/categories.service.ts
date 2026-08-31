import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
        NOT: {
          hiddenBy: { some: { userId } },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isDefault: true,
        userId: true,
      },
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    await this.assertNameAvailable(userId, dto.name);

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        color: dto.color,
        icon: dto.icon,
        isDefault: false,
        userId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isDefault: true,
        userId: true,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (dto.name !== undefined) {
      await this.assertNameAvailable(userId, dto.name, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        color: dto.color,
        icon: dto.icon,
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isDefault: true,
        userId: true,
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id },
      include: { _count: { select: { expenses: true } } },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Categorías predeterminadas: solo se ocultan para el usuario
    // (son globales y compartidas; nunca se borran de la BD).
    if (category.isDefault) {
      await this.prisma.userHiddenCategory.upsert({
        where: {
          userId_categoryId: { userId, categoryId: id },
        },
        update: {},
        create: { userId, categoryId: id },
      });

      return;
    }

    // Categorías propias: ownership + borrado físico.
    if (category.userId !== userId) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category._count.expenses > 0) {
      throw new ConflictException(
        'No se puede eliminar una categoría con gastos asociados',
      );
    }

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar una categoría con gastos asociados',
        );
      }
      throw error;
    }
  }

  assertOwnership(category: { isDefault: boolean }): void {
    if (category.isDefault) {
      throw new ForbiddenException(
        'Las categorías predeterminadas no pueden modificarse',
      );
    }
  }

  private async assertNameAvailable(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const normalized = name.trim().toLowerCase();

    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [{ isDefault: true }, { userId }],
        name: { equals: normalized, mode: 'insensitive' },
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
  }
}
