import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { QueryIncomeDto } from './dto/query-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';

const INCOME_SELECT = {
  id: true,
  description: true,
  amount: true,
  incomeDate: true,
  source: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class IncomesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: QueryIncomeDto) {
    const where = this.buildWhere(userId, query);
    const skip = (query.page - 1) * query.limit;

    const [total, sumResult, data] = await this.prisma.$transaction([
      this.prisma.income.count({ where }),
      this.prisma.income.aggregate({ where, _sum: { amount: true } }),
      this.prisma.income.findMany({
        where,
        orderBy: [{ incomeDate: 'desc' }, { createdAt: 'desc' }],
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
    const income = await this.prisma.income.findFirst({
      where: { id, userId },
    });

    if (!income) {
      throw new NotFoundException('Ingreso no encontrado');
    }

    return income;
  }

  async create(userId: string, dto: CreateIncomeDto) {
    return this.prisma.income.create({
      data: {
        userId,
        description: dto.description,
        amount: new Prisma.Decimal(dto.amount),
        incomeDate: toDateOnly(
          dto.incomeDate ?? new Date().toISOString().slice(0, 10),
        ),
        source: dto.source,
        notes: dto.notes,
      },
      select: INCOME_SELECT,
    });
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto) {
    await this.getById(userId, id);

    return this.prisma.income.update({
      where: { id },
      data: {
        description: dto.description,
        amount:
          dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        incomeDate:
          dto.incomeDate !== undefined ? toDateOnly(dto.incomeDate) : undefined,
        source: dto.source,
        notes: dto.notes,
      },
      select: INCOME_SELECT,
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.prisma.income.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Ingreso no encontrado');
    }
  }

  private buildWhere(
    userId: string,
    query: QueryIncomeDto,
  ): Prisma.IncomeWhereInput {
    const where: Prisma.IncomeWhereInput = { userId };

    if (query.from || query.to) {
      const range: Prisma.DateTimeFilter = {};

      if (query.from) {
        range.gte = toDateOnly(query.from);
      }

      if (query.to) {
        range.lte = toDateOnly(query.to);
      }

      where.incomeDate = range;
    }

    if (query.source && query.source.trim() !== '') {
      where.source = { contains: query.source.trim(), mode: 'insensitive' };
    }

    return where;
  }
}
