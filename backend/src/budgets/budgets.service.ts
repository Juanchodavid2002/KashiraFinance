import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetLineType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBudgetDto,
  CreateBudgetLineDto,
  UpdateBudgetDto,
  UpdateBudgetLineDto,
} from './dto/budget.dto';

const LINE_SELECT = {
  id: true,
  type: true,
  name: true,
  amount: true,
  included: true,
  position: true,
} as const;

type LineRow = {
  type: BudgetLineType;
  amount: Prisma.Decimal;
  included: boolean;
};

/** Totales de un presupuesto: solo cuentan las líneas "incluidas". */
function totals(lines: LineRow[]) {
  let income = new Prisma.Decimal(0);
  let expense = new Prisma.Decimal(0);

  for (const line of lines) {
    if (!line.included) {
      continue;
    }

    if (line.type === BudgetLineType.INCOME) {
      income = income.plus(line.amount);
    } else {
      expense = expense.plus(line.amount);
    }
  }

  return {
    totalIncome: income.toString(),
    totalExpense: expense.toString(),
    balance: income.minus(expense).toString(),
  };
}

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        lines: { select: { type: true, amount: true, included: true } },
      },
    });

    return budgets.map(({ lines, ...budget }) => ({
      ...budget,
      lineCount: lines.length,
      ...totals(lines),
    }));
  }

  async getById(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: {
        lines: {
          select: LINE_SELECT,
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!budget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    return {
      ...budget,
      lines: budget.lines.map((line) => ({
        ...line,
        amount: line.amount.toString(),
      })),
      ...totals(budget.lines),
    };
  }

  async create(userId: string, dto: CreateBudgetDto) {
    const name = dto.name.trim();

    await this.assertNameAvailable(userId, name);

    return this.prisma.budget.create({
      data: { userId, name, notes: dto.notes?.trim() || null },
      select: { id: true, name: true, notes: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOwned(userId, id);

    const name = dto.name?.trim();

    if (name !== undefined) {
      await this.assertNameAvailable(userId, name, id);
    }

    return this.prisma.budget.update({
      where: { id },
      data: {
        name,
        notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
      },
      select: { id: true, name: true, notes: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.prisma.budget.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
  }

  /** Copia un presupuesto con todas sus líneas (para probar otro escenario). */
  async duplicate(userId: string, id: string) {
    const source = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { lines: { orderBy: [{ position: 'asc' }] } },
    });

    if (!source) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    const name = await this.copyName(userId, source.name);

    return this.prisma.budget.create({
      data: {
        userId,
        name,
        notes: source.notes,
        lines: {
          create: source.lines.map((line) => ({
            userId,
            type: line.type,
            name: line.name,
            amount: line.amount,
            included: line.included,
            position: line.position,
          })),
        },
      },
      select: { id: true, name: true },
    });
  }

  async addLine(userId: string, id: string, dto: CreateBudgetLineDto) {
    await this.findOwned(userId, id);

    const last = await this.prisma.budgetLine.aggregate({
      where: { budgetId: id },
      _max: { position: true },
    });

    const line = await this.prisma.budgetLine.create({
      data: {
        budgetId: id,
        userId,
        type: dto.type,
        name: dto.name?.trim() ?? '',
        amount: new Prisma.Decimal(dto.amount ?? 0),
        included: dto.included ?? true,
        position: (last._max.position ?? 0) + 1,
      },
      select: LINE_SELECT,
    });

    await this.touch(id);

    return { ...line, amount: line.amount.toString() };
  }

  async updateLine(
    userId: string,
    id: string,
    lineId: string,
    dto: UpdateBudgetLineDto,
  ) {
    await this.findOwnedLine(userId, id, lineId);

    const line = await this.prisma.budgetLine.update({
      where: { id: lineId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        amount:
          dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        included: dto.included,
      },
      select: LINE_SELECT,
    });

    await this.touch(id);

    return { ...line, amount: line.amount.toString() };
  }

  async removeLine(userId: string, id: string, lineId: string): Promise<void> {
    await this.findOwnedLine(userId, id, lineId);
    await this.prisma.budgetLine.delete({ where: { id: lineId } });
    await this.touch(id);
  }

  private touch(id: string) {
    return this.prisma.budget.update({
      where: { id },
      data: { updatedAt: new Date() },
      select: { id: true },
    });
  }

  private async findOwned(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!budget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    return budget;
  }

  private async findOwnedLine(userId: string, id: string, lineId: string) {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id: lineId, budgetId: id, userId },
      select: { id: true },
    });

    if (!line) {
      throw new NotFoundException('Línea no encontrada');
    }

    return line;
  }

  private async assertNameAvailable(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ya existe un presupuesto con ese nombre');
    }
  }

  private async copyName(userId: string, base: string): Promise<string> {
    let candidate = `${base} (copia)`;
    let n = 2;

    while (
      await this.prisma.budget.findFirst({
        where: { userId, name: { equals: candidate, mode: 'insensitive' } },
        select: { id: true },
      })
    ) {
      candidate = `${base} (copia ${n++})`;
    }

    return candidate.slice(0, 100);
  }
}
