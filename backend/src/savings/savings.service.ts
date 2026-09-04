import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SavingsMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsDto } from './dto/create-savings.dto';
import { UpdateSavingsDto } from './dto/update-savings.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { QuerySavingsDto } from './dto/query-savings.dto';

const MOVEMENT_SELECT = {
  id: true,
  type: true,
  amount: true,
  notes: true,
  createdAt: true,
} as const;

function toAmountString(value: Prisma.Decimal | string | null): string {
  if (value === null || value === undefined) {
    return '0.00';
  }

  return new Prisma.Decimal(value).toString();
}

@Injectable()
export class SavingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: QuerySavingsDto) {
    const where: Prisma.SavingsGoalWhereInput = { userId };

    if (query.search && query.search.trim() !== '') {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.savingsGoal.count({ where }),
      this.prisma.savingsGoal.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const goals = data.map((goal) => this.mapGoal(goal));

    return {
      data: goals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        reachedCount: goals.filter(
          (g) => new Prisma.Decimal(g.balance).greaterThanOrEqualTo(g.targetAmount),
        ).length,
      },
    };
  }

  async getById(userId: string, id: string) {
    const [goal, movements] = await this.prisma.$transaction([
      this.prisma.savingsGoal.findFirst({ where: { id, userId } }),
      this.prisma.savingsMovement.findMany({
        where: { goalId: id, userId },
        select: MOVEMENT_SELECT,
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    if (!goal) {
      throw new NotFoundException('Ahorro no encontrado');
    }

    return {
      ...this.mapGoal(goal),
      movements: movements.map((m) => ({
        ...m,
        amount: toAmountString(m.amount),
      })),
    };
  }

  async create(userId: string, dto: CreateSavingsDto) {
    return this.prisma.savingsGoal.create({
      data: {
        userId,
        name: dto.name,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        deadline: dto.deadline ? new Date(`${dto.deadline}T00:00:00.000Z`) : null,
        notes: dto.notes,
      },
      select: { id: true, createdAt: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateSavingsDto) {
    const current = await this.getById(userId, id);

    if (
      dto.targetAmount !== undefined &&
      new Prisma.Decimal(dto.targetAmount).lessThan(current.balance)
    ) {
      throw new BadRequestException(
        'El monto objetivo no puede ser menor al saldo actual',
      );
    }

    return this.prisma.savingsGoal.update({
      where: { id },
      data: {
        name: dto.name,
        targetAmount:
          dto.targetAmount !== undefined
            ? new Prisma.Decimal(dto.targetAmount)
            : undefined,
        deadline: dto.deadline !== undefined
          ? dto.deadline
            ? new Date(`${dto.deadline}T00:00:00.000Z`)
            : null
          : undefined,
        notes: dto.notes,
        status: dto.status,
      },
      select: { id: true, updatedAt: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.prisma.savingsGoal.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Ahorro no encontrado');
    }
  }

  async deposit(userId: string, id: string, dto: DepositDto) {
    const goal = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.savingsGoal.findFirst({
        where: { id, userId },
        select: { id: true, balance: true, targetAmount: true },
      });

      if (!existing) {
        throw new NotFoundException('Ahorro no encontrado');
      }

      const amount = new Prisma.Decimal(dto.amount);
      const newBalance = new Prisma.Decimal(existing.balance).plus(amount);

      const updated = await tx.savingsGoal.update({
        where: { id },
        data: {
          balance: newBalance,
          status: newBalance.greaterThanOrEqualTo(existing.targetAmount)
            ? 'REACHED'
            : 'ACTIVE',
        },
        select: { id: true, balance: true, status: true },
      });

      await tx.savingsMovement.create({
        data: {
          goalId: id,
          userId,
          type: SavingsMovementType.DEPOSIT,
          amount,
          notes: dto.notes,
        },
      });

      return updated;
    });

    return {
      id,
      balance: toAmountString(goal.balance),
      status: goal.status,
    };
  }

  async withdraw(userId: string, id: string, dto: WithdrawDto) {
    const goal = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.savingsGoal.findFirst({
        where: { id, userId },
        select: { id: true, balance: true, targetAmount: true },
      });

      if (!existing) {
        throw new NotFoundException('Ahorro no encontrado');
      }

      const amount = new Prisma.Decimal(dto.amount);
      const currentBalance = new Prisma.Decimal(existing.balance);

      if (amount.greaterThan(currentBalance)) {
        throw new BadRequestException(
          `El retiro excede el saldo disponible (${currentBalance.toString()})`,
        );
      }

      const newBalance = currentBalance.minus(amount);

      const updated = await tx.savingsGoal.update({
        where: { id },
        data: {
          balance: newBalance,
          status: newBalance.greaterThanOrEqualTo(existing.targetAmount)
            ? 'REACHED'
            : 'ACTIVE',
        },
        select: { id: true, balance: true, status: true },
      });

      await tx.savingsMovement.create({
        data: {
          goalId: id,
          userId,
          type: SavingsMovementType.WITHDRAW,
          amount,
          notes: dto.notes,
        },
      });

      return updated;
    });

    return {
      id,
      balance: toAmountString(goal.balance),
      status: goal.status,
    };
  }

  async removeMovement(
    userId: string,
    goalId: string,
    movementId: string,
  ): Promise<void> {
    await this.getById(userId, goalId);

    await this.prisma.$transaction(async (tx) => {
      const movement = await tx.savingsMovement.findFirst({
        where: { id: movementId, goalId, userId },
        select: { id: true, type: true, amount: true },
      });

      if (!movement) {
        throw new NotFoundException('Movimiento no encontrado');
      }

      const goal = await tx.savingsGoal.findUniqueOrThrow({
        where: { id: goalId },
        select: { balance: true, targetAmount: true },
      });

      const delta =
        movement.type === SavingsMovementType.DEPOSIT
          ? new Prisma.Decimal(0).minus(movement.amount)
          : new Prisma.Decimal(movement.amount);

      const newBalance = new Prisma.Decimal(goal.balance).plus(delta);

      await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          balance: newBalance,
          status: newBalance.greaterThanOrEqualTo(goal.targetAmount)
            ? 'REACHED'
            : 'ACTIVE',
        },
      });

      await tx.savingsMovement.delete({ where: { id: movementId } });
    });
  }

  async totalBalance(userId: string): Promise<string> {
    const agg = await this.prisma.savingsGoal.aggregate({
      where: { userId, status: { not: 'CLOSED' } },
      _sum: { balance: true },
    });

    return toAmountString(agg._sum.balance ?? null);
  }

  private mapGoal(goal: {
    id: string;
    userId: string;
    name: string;
    targetAmount: Prisma.Decimal;
    balance: Prisma.Decimal;
    deadline: Date | null;
    notes: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetAmount: toAmountString(goal.targetAmount),
      balance: toAmountString(goal.balance),
      deadline: goal.deadline,
      notes: goal.notes,
      status: goal.status,
      remainingAmount: toAmountString(
        new Prisma.Decimal(goal.targetAmount).minus(goal.balance),
      ),
      progressPercent: goal.targetAmount.isZero()
        ? 0
        : Math.min(
            100,
            Math.round(
              Number(goal.balance.dividedBy(goal.targetAmount).times(100)),
            ),
          ),
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }
}
