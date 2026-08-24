import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

const EXPENSE_SELECT = {
  id: true,
  description: true,
  amount: true,
  expenseDate: true,
  paymentMethod: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, name: true, color: true },
  },
} as const;

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: QueryExpenseDto) {
    const where: Prisma.ExpenseWhereInput = this.buildWhere(userId, query);
    const skip = (query.page - 1) * query.limit;

    const [total, sumResult, data] = await this.prisma.$transaction([
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
      this.prisma.expense.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
        },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        sum: sumResult._sum.amount?.toString() ?? '0',
      },
    };
  }

  async getById(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId },
      include: { category: { select: { id: true, name: true, color: true } } },
    });

    if (!expense) {
      throw new NotFoundException('Gasto no encontrado');
    }

    return expense;
  }

  async create(userId: string, dto: CreateExpenseDto) {
    await this.assertCategoryAccessible(userId, dto.categoryId);

    return this.prisma.expense.create({
      data: {
        userId,
        description: dto.description,
        amount: new Prisma.Decimal(dto.amount),
        categoryId: dto.categoryId,
        expenseDate: toDateOnly(
          dto.expenseDate ?? new Date().toISOString().slice(0, 10),
        ),
        paymentMethod: dto.paymentMethod ?? 'CASH',
        notes: dto.notes,
      },
      select: EXPENSE_SELECT,
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    await this.getById(userId, id);

    if (dto.categoryId !== undefined) {
      await this.assertCategoryAccessible(userId, dto.categoryId);
    }

    const expenseDate =
      dto.expenseDate !== undefined ? toDateOnly(dto.expenseDate) : undefined;

    const data: Prisma.ExpenseUpdateInput = {
      description: dto.description,
      amount:
        dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
      expenseDate,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      category:
        dto.categoryId !== undefined
          ? { connect: { id: dto.categoryId } }
          : undefined,
    };

    return this.prisma.expense.update({
      where: { id },
      data,
      select: EXPENSE_SELECT,
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.prisma.expense.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Gasto no encontrado');
    }
  }

  private buildWhere(
    userId: string,
    query: QueryExpenseDto,
  ): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = { userId };

    if (query.from || query.to) {
      const range: Prisma.DateTimeFilter = {};

      if (query.from) {
        range.gte = toDateOnly(query.from);
      }

      if (query.to) {
        range.lte = toDateOnly(query.to);
      }

      where.expenseDate = range;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.search && query.search.trim() !== '') {
      where.description = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    return where;
  }

  private async assertCategoryAccessible(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const accessible = await this.prisma.category.findFirst({
      where: { id: categoryId, OR: [{ isDefault: true }, { userId }] },
      select: { id: true },
    });

    if (!accessible) {
      throw new NotFoundException('Categoría no válida');
    }
  }
}
