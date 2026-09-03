import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, DebtKind, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { QueryDebtDto } from './dto/query-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';

const DEBT_PAYMENTS_SELECT = {
  id: true,
  amount: true,
  paidDate: true,
  notes: true,
  createdAt: true,
} as const;

const DEFAULT_DEBT_CATEGORY = 'Deudas';

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);

  return result;
}

function resolveDueDate(
  kind: DebtKind,
  startDate: string,
  totalInstallments: number | null | undefined,
  paidInstallments: number | null | undefined,
  providedDueDate?: string,
): Date | null {
  if (kind === DebtKind.ENTITY) {
    const total = totalInstallments ?? 0;
    const paid = paidInstallments ?? 0;
    const remaining = total - paid;

    if (remaining <= 0) {
      return null;
    }

    return addMonths(toDateOnly(startDate), remaining);
  }

  if (!providedDueDate) {
    return null;
  }

  return toDateOnly(providedDueDate);
}

function debtWithBalance(debt: {
  id: string;
  userId: string;
  kind: DebtKind;
  name: string;
  lender: string | null;
  totalAmount: Prisma.Decimal;
  totalInstallments: number | null;
  paidInstallments: number | null;
  installmentAmount: Prisma.Decimal | null;
  startDate: Date;
  dueDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _sum: { amount: Prisma.Decimal | null };
}): {
  id: string;
  userId: string;
  kind: DebtKind;
  name: string;
  lender: string | null;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  status: 'PENDING' | 'PAID';
  totalInstallments: number | null;
  paidInstallments: number | null;
  installmentAmount: string | null;
  startDate: Date;
  dueDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
} {
  const total = debt.totalAmount;
  const paid = debt._sum.amount ?? new Prisma.Decimal(0);
  const remaining = total.minus(paid);

  return {
    id: debt.id,
    userId: debt.userId,
    kind: debt.kind,
    name: debt.name,
    lender: debt.lender,
    totalAmount: total.toString(),
    paidAmount: paid.toString(),
    remainingAmount: remaining.toString(),
    status: remaining.isZero() ? 'PAID' : 'PENDING',
    totalInstallments: debt.totalInstallments,
    paidInstallments: debt.paidInstallments,
    installmentAmount: debt.installmentAmount?.toString() ?? null,
    startDate: debt.startDate,
    dueDate: debt.dueDate,
    notes: debt.notes,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
  };
}

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: QueryDebtDto) {
    const where: Prisma.DebtWhereInput = this.buildWhere(userId, query);
    const skip = (query.page - 1) * query.limit;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.debt.count({ where }),
      this.prisma.debt.findMany({
        where,
        include: { _count: { select: { payments: true } } },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
    ]);

    const rows = await Promise.all(
      data.map(async (debt) => {
        const agg = await this.prisma.debtPayment.aggregate({
          where: { debtId: debt.id },
          _sum: { amount: true },
        });
        return debtWithBalance({ ...debt, _sum: agg._sum });
      }),
    );

    return {
      data: rows,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        pendingCount: rows.filter((d) => d.status === 'PENDING').length,
      },
    };
  }

  async getById(userId: string, id: string) {
    const [debt, agg, payments] = await this.prisma.$transaction([
      this.prisma.debt.findFirst({ where: { id, userId } }),
      this.prisma.debtPayment.aggregate({
        where: { debtId: id, userId },
        _sum: { amount: true },
      }),
      this.prisma.debtPayment.findMany({
        where: { debtId: id, userId },
        select: DEBT_PAYMENTS_SELECT,
        orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    if (!debt) {
      throw new NotFoundException('Deuda no encontrada');
    }

    return {
      ...debtWithBalance({ ...debt, _sum: agg._sum }),
      payments,
    };
  }

  async create(userId: string, dto: CreateDebtDto) {
    const startDate = dto.startDate ?? this.today();
    const dueDate = resolveDueDate(
      dto.kind,
      startDate,
      dto.totalInstallments,
      dto.paidInstallments,
      dto.dueDate,
    );

    return this.prisma.debt.create({
      data: {
        userId,
        kind: dto.kind,
        name: dto.name,
        lender: dto.lender,
        totalAmount: new Prisma.Decimal(dto.totalAmount),
        totalInstallments: dto.totalInstallments,
        paidInstallments: dto.paidInstallments,
        installmentAmount:
          dto.installmentAmount !== undefined
            ? new Prisma.Decimal(dto.installmentAmount)
            : undefined,
        startDate: toDateOnly(startDate),
        dueDate,
        notes: dto.notes,
      },
      select: { id: true, createdAt: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateDebtDto) {
    const current = await this.getById(userId, id);

    const newTotal =
      dto.totalAmount !== undefined
        ? new Prisma.Decimal(dto.totalAmount)
        : undefined;

    if (newTotal !== undefined && newTotal.lessThan(current.paidAmount)) {
      throw new BadRequestException(
        'El monto total no puede ser menor al monto ya pagado',
      );
    }

    const kind = dto.kind ?? current.kind;
    const startDate =
      dto.startDate ?? new Date(current.startDate).toISOString().slice(0, 10);
    const totalInstallments =
      dto.totalInstallments ?? current.totalInstallments;
    const paidInstallments = dto.paidInstallments ?? current.paidInstallments;
    const existingDueDate = current.dueDate
      ? new Date(current.dueDate).toISOString().slice(0, 10)
      : dto.dueDate === ''
        ? ''
        : undefined;
    const dueDate = resolveDueDate(
      kind,
      startDate,
      totalInstallments,
      paidInstallments,
      dto.dueDate !== undefined ? dto.dueDate : existingDueDate,
    );

    return this.prisma.debt.update({
      where: { id },
      data: {
        kind: dto.kind,
        name: dto.name,
        lender: dto.lender,
        totalAmount: newTotal,
        totalInstallments: dto.totalInstallments,
        paidInstallments: dto.paidInstallments,
        installmentAmount:
          dto.installmentAmount !== undefined
            ? new Prisma.Decimal(dto.installmentAmount)
            : undefined,
        startDate:
          dto.startDate !== undefined ? toDateOnly(dto.startDate) : undefined,
        dueDate,
        notes: dto.notes,
      },
      select: { id: true, updatedAt: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findFirst({
        where: { id, userId },
        select: { id: true },
      });

      if (!debt) {
        throw new NotFoundException('Deuda no encontrada');
      }

      const paymentRows = await tx.debtPayment.findMany({
        where: { debtId: id, userId },
        select: { id: true },
      });

      if (paymentRows.length > 0) {
        await tx.expense.deleteMany({
          where: {
            userId,
            debtPaymentId: { in: paymentRows.map((p) => p.id) },
          },
        });
      }

      await tx.debt.delete({ where: { id } });
    });

    return deleted;
  }

  async addPayment(userId: string, debtId: string, dto: CreateDebtPaymentDto) {
    await this.getById(userId, debtId);

    const payment = await this.prisma.$transaction(async (tx) => {
      const { total, paid, debt } = await this.getPaymentContextTx(
        tx,
        userId,
        debtId,
      );
      const remaining = total.minus(paid);

      let amount = new Prisma.Decimal(dto.amount);

      if (dto.installment) {
        const installmentAmount = debt.installmentAmount;

        if (!installmentAmount) {
          throw new BadRequestException(
            'Esta deuda no tiene un valor de cuota definido',
          );
        }

        const { totalInstallments, paidInstallments } = debt;

        if (
          totalInstallments !== null &&
          paidInstallments !== null &&
          paidInstallments >= totalInstallments
        ) {
          throw new BadRequestException(
            'Ya no quedan cuotas por pagar en esta deuda',
          );
        }

        amount = installmentAmount;
      }

      if (amount.greaterThan(remaining)) {
        throw new BadRequestException(
          `El pago excede el saldo pendiente (${remaining.toString()})`,
        );
      }

      const categoryId = await this.resolveDebtCategoryTx(
        tx,
        userId,
        dto.categoryId,
      );
      const paidDate = toDateOnly(dto.paidDate ?? this.today());

      const created = await tx.debtPayment.create({
        data: {
          debtId,
          userId,
          amount,
          paidDate,
          notes: dto.notes,
        },
        select: DEBT_PAYMENTS_SELECT,
      });

      await tx.expense.create({
        data: {
          userId,
          categoryId,
          description: `Pago deuda: ${(await this.debtNameTx(tx, debtId)) ?? 'Deuda'}`,
          amount,
          expenseDate: paidDate,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
          notes: dto.notes,
          debtPaymentId: created.id,
        },
      });

      if (dto.installment && debt.paidInstallments !== null) {
        await tx.debt.update({
          where: { id: debtId },
          data: { paidInstallments: { increment: 1 } },
        });
      }

      return created;
    });

    return payment;
  }

  async removePayment(
    userId: string,
    debtId: string,
    paymentId: string,
  ): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const deletedPayment = await tx.debtPayment.deleteMany({
        where: { id: paymentId, debtId, userId },
      });

      if (deletedPayment.count === 0) {
        throw new NotFoundException('Pago no encontrado');
      }

      await tx.expense.deleteMany({
        where: { userId, debtPaymentId: paymentId },
      });
    });

    return result;
  }

  async listPayments(userId: string, debtId: string) {
    await this.getById(userId, debtId);

    return this.prisma.debtPayment.findMany({
      where: { debtId, userId },
      select: DEBT_PAYMENTS_SELECT,
      orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async getPaymentContextTx(
    tx: Prisma.TransactionClient,
    userId: string,
    debtId: string,
  ) {
    const debt = await tx.debt.findFirst({
      where: { id: debtId, userId },
      select: {
        totalAmount: true,
        installmentAmount: true,
        totalInstallments: true,
        paidInstallments: true,
      },
    });

    if (!debt) {
      throw new NotFoundException('Deuda no encontrada');
    }

    const agg = await tx.debtPayment.aggregate({
      where: { debtId, userId },
      _sum: { amount: true },
    });

    return {
      total: debt.totalAmount,
      paid: agg._sum.amount ?? new Prisma.Decimal(0),
      debt,
    };
  }

  private async debtNameTx(
    tx: Prisma.TransactionClient,
    debtId: string,
  ): Promise<string | null> {
    const debt = await tx.debt.findUnique({
      where: { id: debtId },
      select: { name: true },
    });

    return debt?.name ?? null;
  }

  private async resolveDebtCategoryTx(
    tx: Prisma.TransactionClient,
    userId: string,
    categoryId?: string,
  ): Promise<string> {
    if (categoryId) {
      const accessible = await tx.category.findFirst({
        where: { id: categoryId, OR: [{ isDefault: true }, { userId }] },
        select: { id: true },
      });

      if (!accessible) {
        throw new NotFoundException('Categoría no válida');
      }

      return accessible.id;
    }

    const defaultCategory = await tx.category.findFirst({
      where: {
        name: DEFAULT_DEBT_CATEGORY,
        OR: [{ isDefault: true, userId: null }, { userId }],
      },
      select: { id: true },
      orderBy: [{ isDefault: 'desc' }],
    });

    if (defaultCategory) {
      return defaultCategory.id;
    }

    const created = await tx.category.create({
      data: { name: DEFAULT_DEBT_CATEGORY, color: '#DC2626', userId },
      select: { id: true },
    });

    return created.id;
  }

  private buildWhere(
    userId: string,
    query: QueryDebtDto,
  ): Prisma.DebtWhereInput {
    const where: Prisma.DebtWhereInput = { userId };

    if (query.search && query.search.trim() !== '') {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { lender: { contains: term, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
