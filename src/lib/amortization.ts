import type { Asset } from './types';

export type AmortizationRow = {
  date: string; // ISO
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingPrincipal: number;
};

export function isFixedIncomeAsset(asset: Asset): boolean {
  return asset.category === 'fixed_income' || asset.category === 'bonds';
}

export function buildEstimatedAmortizationSchedule(params: {
  principal: number;
  annualInterestRatePercent: number;
  startDate: Date;
  maturityDate: Date;
}): { rows: AmortizationRow[]; totalInterest: number; totalPrincipal: number } {
  const principal = Math.max(0, Number(params.principal) || 0);
  const rate = Math.max(0, Number(params.annualInterestRatePercent) || 0) / 100;
  const start = new Date(params.startDate);
  const maturity = new Date(params.maturityDate);

  if (!Number.isFinite(principal) || principal <= 0) {
    return { rows: [], totalInterest: 0, totalPrincipal: 0 };
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(maturity.getTime())) {
    return { rows: [], totalInterest: 0, totalPrincipal: 0 };
  }

  // Only future schedules (start <= maturity)
  if (maturity.getTime() <= start.getTime()) {
    return { rows: [], totalInterest: 0, totalPrincipal: 0 };
  }

  // Monthly equal-principal payments between start and maturity.
  const months =
    (maturity.getFullYear() - start.getFullYear()) * 12 +
    (maturity.getMonth() - start.getMonth()) +
    1;
  const termMonths = Math.max(1, months);

  const principalPerMonth = principal / termMonths;
  const monthlyRate = rate / 12;

  let remaining = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  const rows: AmortizationRow[] = [];

  const date = new Date(start);
  date.setHours(9, 0, 0, 0);

  for (let i = 0; i < termMonths; i++) {
    const interestPayment = remaining * monthlyRate;
    const principalPayment = i === termMonths - 1 ? remaining : principalPerMonth;
    const nextRemaining = Math.max(0, remaining - principalPayment);

    rows.push({
      date: new Date(date).toISOString(),
      principalPayment,
      interestPayment,
      totalPayment: principalPayment + interestPayment,
      remainingPrincipal: nextRemaining,
    });

    totalInterest += interestPayment;
    totalPrincipal += principalPayment;
    remaining = nextRemaining;

    date.setMonth(date.getMonth() + 1);
  }

  return { rows, totalInterest, totalPrincipal };
}

