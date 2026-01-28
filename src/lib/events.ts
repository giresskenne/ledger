import React from 'react';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { useNotificationsStore, type PortfolioEvent } from '@/lib/notifications-store';
import { useRoomStore, getCurrentTaxYearId, formatTaxYear } from '@/lib/room-store';
import { usePortfolioStore } from '@/lib/store';
import { formatCurrency } from '@/lib/formatters';
import type { Asset, PayFrequency, RegisteredAccountType } from '@/lib/types';

type GeneratedEvent = Omit<PortfolioEvent, 'isRead' | 'createdAt'>;

const GENERATED_PREFIXES = ['maturity_', 'contrib_', 'assetcontrib_', 'rebalance_'] as const;

export function isGeneratedEventId(id: string): boolean {
  return GENERATED_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function toISODateId(date: Date): string {
  // YYYY-MM-DD
  return date.toISOString().slice(0, 10);
}

function toMonthId(date: Date): string {
  // YYYY-MM
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dueDateForWeekday(params: { year: number; monthIndex: number; day: number; weekday: number }): Date {
  const base = new Date(params.year, params.monthIndex, params.day);
  base.setHours(9, 0, 0, 0);
  const currentWeekday = base.getDay();
  const target = Math.max(0, Math.min(6, Math.floor(params.weekday)));
  const delta = (target - currentWeekday + 7) % 7;
  const due = new Date(base);
  due.setDate(due.getDate() + delta);
  return due;
}

function startOfTodayAtNine(now = new Date()): Date {
  const date = new Date(now);
  date.setHours(9, 0, 0, 0);
  return date;
}

function thisWeeksDueDate(weekday: number, now = new Date()): Date {
  const target = Math.max(0, Math.min(6, Math.floor(weekday)));
  const todayAtNine = startOfTodayAtNine(now);
  const currentWeekday = todayAtNine.getDay();
  const delta = currentWeekday - target;
  const due = new Date(todayAtNine);
  due.setDate(due.getDate() - ((delta + 7) % 7));
  return due;
}

function nextWeeksDueDate(weekday: number, now = new Date()): Date {
  const dueThisWeek = thisWeeksDueDate(weekday, now);
  const next = new Date(dueThisWeek);
  next.setDate(next.getDate() + 7);
  return next;
}

function toDateId(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dueDateForMonth(params: { year: number; monthIndex: number; dayOfMonth: number }): Date {
  const day = Math.max(1, Math.min(28, Math.floor(params.dayOfMonth)));
  const date = new Date(params.year, params.monthIndex, day);
  date.setHours(9, 0, 0, 0);
  return date;
}

function startOfTomorrow(date = new Date()): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

function nextFriday(date = new Date()): Date {
  const next = new Date(date);
  // 0=Sun ... 5=Fri
  const day = next.getDay();
  const delta = (5 - day + 7) % 7 || 7;
  next.setDate(next.getDate() + delta);
  next.setHours(9, 0, 0, 0);
  return next;
}

function firstOfNextMonth(date = new Date()): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1, 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

function getNextContributionDueDate(frequency: PayFrequency, now = new Date()): Date {
  if (frequency === 'monthly') return firstOfNextMonth(now);
  if (frequency === 'biweekly') {
    const base = nextFriday(now);
    const biweekly = new Date(base);
    biweekly.setDate(biweekly.getDate() + 14);
    return biweekly;
  }
  // weekly
  return nextFriday(now);
}

export function generateAssetContributionEvents(assets: Asset[], now = new Date()): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];

  for (const asset of assets) {
    const recurring = asset.recurringContribution;
    if (!recurring?.enabled) continue;
    const amount = Math.max(0, Number(recurring.amount) || 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const frequency = recurring.frequency;
    const weekday = recurring.weekday ?? now.getDay();

    let dueDate: Date;
    let occurrenceId: string;

    if (frequency === 'monthly') {
      const dayOfMonth = Math.max(1, Math.min(28, Math.floor(recurring.dayOfMonth ?? 1)));
      const dueThisMonth = dueDateForMonth({
        year: now.getFullYear(),
        monthIndex: now.getMonth(),
        dayOfMonth,
      });
      const currentMonthId = toMonthId(now);
      const dueThisMonthId = toMonthId(dueThisMonth);

      // If overdue and not validated, keep the current month's due date.
      // Otherwise show the next upcoming due date.
      const needsCurrentMonth =
        now.getTime() >= dueThisMonth.getTime() && recurring.lastValidatedId !== currentMonthId;

      dueDate = needsCurrentMonth
        ? dueThisMonth
        : now.getTime() < dueThisMonth.getTime()
          ? dueThisMonth
          : dueDateForMonth({
              year: now.getFullYear(),
              monthIndex: now.getMonth() + 1,
              dayOfMonth,
            });

      occurrenceId = toMonthId(dueDate);

      // If this month's contribution is already validated, only show the next upcoming event.
      if (
        recurring.lastValidatedId === dueThisMonthId &&
        dueThisMonthId === currentMonthId &&
        now.getTime() >= dueThisMonth.getTime()
      ) {
        continue;
      }
    } else if (frequency === 'weekly') {
      const dueThisWeek = thisWeeksDueDate(weekday, now);
      const dueThisWeekId = toDateId(dueThisWeek);

      if (now.getTime() >= dueThisWeek.getTime() && recurring.lastValidatedId !== dueThisWeekId) {
        dueDate = dueThisWeek;
        occurrenceId = dueThisWeekId;
      } else {
        dueDate = nextWeeksDueDate(weekday, now);
        occurrenceId = toDateId(dueDate);
      }
    } else {
      // biweekly
      const lastAppliedId = recurring.lastAppliedId;
      const lastAppliedDate = lastAppliedId ? new Date(lastAppliedId) : null;

      if (lastAppliedDate && !Number.isNaN(lastAppliedDate.getTime())) {
        const base = new Date(lastAppliedDate);
        base.setHours(9, 0, 0, 0);
        const next = new Date(base);
        next.setDate(next.getDate() + 14);
        dueDate = next;
        occurrenceId = toDateId(next);
      } else {
        const dueThisWeek = thisWeeksDueDate(weekday, now);
        const dueThisWeekId = toDateId(dueThisWeek);

        if (now.getTime() >= dueThisWeek.getTime() && recurring.lastValidatedId !== dueThisWeekId) {
          dueDate = dueThisWeek;
          occurrenceId = dueThisWeekId;
        } else {
          dueDate = nextWeeksDueDate(weekday, now);
          occurrenceId = toDateId(dueDate);
        }
      }
    }

    const isDueOrPast = now.getTime() >= dueDate.getTime();
    const isApplied = recurring.lastAppliedId === occurrenceId;
    const needsValidation = isDueOrPast && isApplied && recurring.lastValidatedId !== occurrenceId;

    events.push({
      id: `assetcontrib_${asset.id}_${frequency}_${occurrenceId}`,
      type: 'contribution_reminder',
      title: needsValidation
        ? `Validate your ${asset.name} contribution`
        : `${frequency === 'monthly' ? 'Monthly' : frequency === 'weekly' ? 'Weekly' : 'Bi-weekly'} contribution: ${asset.name}`,
      description: needsValidation
        ? `Auto-added ${formatCurrency(amount, asset.currency)}. Tap to confirm it looks right.`
        : isDueOrPast
          ? `Due now — add ${formatCurrency(amount, asset.currency)} and mark it done.`
          : `Plan to add ${formatCurrency(amount, asset.currency)} by ${dueDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}.`,
      date: dueDate.toISOString(),
      assetId: asset.id,
      assetName: asset.name,
      amount,
      currency: asset.currency,
    });
  }

  return events;
}

export function generateMaturityEvents(assets: Asset[]): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const now = new Date();

  for (const asset of assets) {
    if (!asset.maturityDate) continue;

    const maturityDate = new Date(asset.maturityDate);
    if (Number.isNaN(maturityDate.getTime())) continue;

    const daysUntil = Math.ceil(
      (maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Show events that are in a useful window: 30 days past due through 12 months ahead.
    if (daysUntil < -30 || daysUntil > 365) continue;

    events.push({
      id: `maturity_${asset.id}`,
      type: 'maturity',
      title: `${asset.name} Matures`,
      description:
        daysUntil <= 0
          ? 'Matured — review next steps'
          : daysUntil === 1
            ? 'Matures tomorrow'
            : daysUntil <= 7
              ? `Matures in ${daysUntil} days`
              : `Matures on ${maturityDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}`,
      date: maturityDate.toISOString(),
      assetId: asset.id,
      assetName: asset.name,
      amount: asset.currentPrice * asset.quantity,
      currency: asset.currency,
    });
  }

  return events;
}

function getLastValuationDate(asset: Asset): Date {
  const history = asset.valueHistory ?? [];
  const latestHistory = history
    .map((h) => new Date(h.date))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  if (latestHistory) return latestHistory;

  const lastUpdated = new Date(asset.lastUpdated);
  if (!Number.isNaN(lastUpdated.getTime())) return lastUpdated;

  const purchaseDate = new Date(asset.purchaseDate);
  if (!Number.isNaN(purchaseDate.getTime())) return purchaseDate;

  return new Date();
}

export function generateStaleValuationEvents(params: {
  assets: Asset[];
  staleDays: number;
}): GeneratedEvent[] {
  const { assets, staleDays } = params;
  const days = Math.max(1, Math.floor(staleDays));
  const now = new Date();
  const events: GeneratedEvent[] = [];

  for (const asset of assets) {
    if (!asset.isManual) continue;

    const last = getLastValuationDate(asset);
    const due = new Date(last);
    due.setHours(9, 0, 0, 0);
    due.setDate(due.getDate() + days);

    const daysUntil = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Keep the window similar to maturity: 30 days past due through 12 months ahead.
    if (daysUntil < -30 || daysUntil > 365) continue;

    events.push({
      id: `stalevaluation_${asset.id}_${toISODateId(due)}`,
      type: 'stale_valuation',
      title: `Update ${asset.name}`,
      description:
        daysUntil <= 0
          ? 'Value is stale — tap to update'
          : daysUntil === 1
            ? 'Value becomes stale tomorrow'
            : `Value becomes stale in ${daysUntil} days`,
      date: due.toISOString(),
      assetId: asset.id,
      assetName: asset.name,
      currency: asset.currency,
    });
  }

  return events;
}

export function generateContributionEvents(params: {
  enabledAccountTypes: RegisteredAccountType[];
  payFrequency: PayFrequency;
  getSavingsTarget: (accountType: RegisteredAccountType) => {
    perPeriodTarget: number;
    frequency: PayFrequency;
    taxYearEndDate: string;
  } | null;
  currency: Parameters<typeof formatCurrency>[1];
  taxYearId: string;
}): GeneratedEvent[] {
  const {
    enabledAccountTypes,
    payFrequency,
    getSavingsTarget,
    currency,
    taxYearId,
  } = params;

  const now = new Date();
  const dueDate = getNextContributionDueDate(payFrequency, now);
  const events: GeneratedEvent[] = [];

  for (const accountType of enabledAccountTypes) {
    const target = getSavingsTarget(accountType);
    if (!target) continue;

    const amount = Math.max(0, Math.round(target.perPeriodTarget));
    if (amount <= 0) continue;

    events.push({
      id: `contrib_${accountType}_${toISODateId(dueDate)}`,
      type: 'contribution_reminder',
      title: `${accountType} Contribution Due`,
      description: `Set aside ${formatCurrency(amount, currency)} this ${payFrequency} to stay on track for ${formatTaxYear(taxYearId)}.`,
      date: dueDate.toISOString(),
      amount,
      currency: typeof currency === 'string' ? currency : undefined,
    });
  }

  return events;
}

export function generateRebalanceEvent(params: {
  riskSummary: { overallRiskScore: number; suggestions: string[] };
  hasAssets: boolean;
}): GeneratedEvent[] {
  const { riskSummary, hasAssets } = params;
  const suggestions = riskSummary.suggestions.filter(Boolean);

  if (!hasAssets) return [];
  if (suggestions.length === 0 && riskSummary.overallRiskScore < 7) return [];

  const now = new Date();
  const reviewDate = startOfTomorrow(now);
  reviewDate.setDate(reviewDate.getDate() + 14);

  const hint =
    suggestions[0]?.replace(/\s+/g, ' ').trim() ||
    'Check your allocations and make sure your portfolio still matches your goals.';

  return [
    {
      id: `rebalance_${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, '0')}`,
      type: 'rebalance',
      title: 'Portfolio Review',
      description: hint,
      date: reviewDate.toISOString(),
    },
  ];
}

export function generateGeneratedEvents(params: {
  assets: Asset[];
  enabledAccountTypes: RegisteredAccountType[];
  payFrequency: PayFrequency;
  getSavingsTarget: (accountType: RegisteredAccountType) => {
    perPeriodTarget: number;
    frequency: PayFrequency;
    taxYearEndDate: string;
  } | null;
  currency: Parameters<typeof formatCurrency>[1];
  taxYearId: string | null;
  riskSummary: { overallRiskScore: number; suggestions: string[] };
  notificationPrefs: { staleValuationReminders: boolean; staleValuationDays: number };
}): GeneratedEvent[] {
  const maturity = generateMaturityEvents(params.assets);
  const assetContrib = generateAssetContributionEvents(params.assets);
  const staleValuation =
    params.notificationPrefs.staleValuationReminders
      ? generateStaleValuationEvents({
          assets: params.assets,
          staleDays: params.notificationPrefs.staleValuationDays,
        })
      : [];

  const contribution =
    params.taxYearId && params.enabledAccountTypes.length > 0
      ? generateContributionEvents({
          enabledAccountTypes: params.enabledAccountTypes,
          payFrequency: params.payFrequency,
          getSavingsTarget: params.getSavingsTarget,
          currency: params.currency,
          taxYearId: params.taxYearId,
        })
      : [];

  const rebalance = generateRebalanceEvent({
    riskSummary: params.riskSummary,
    hasAssets: params.assets.length > 0,
  });

  return [...maturity, ...assetContrib, ...staleValuation, ...contribution, ...rebalance];
}

export function useSyncGeneratedEvents(): () => void {
  const assets = usePortfolioStore((s) => s.assets);
  const getRiskAnalysis = usePortfolioStore((s) => s.getRiskAnalysis);
  const applyAssetContribution = usePortfolioStore((s) => s.applyAssetContribution);
  const updateAsset = usePortfolioStore((s) => s.updateAsset);
  const risk = React.useMemo(() => {
    if (assets.length === 0) {
      return { overallRiskScore: 0, suggestions: [] as string[] };
    }
    return getRiskAnalysis();
  }, [getRiskAnalysis, assets]);

  const jurisdictionProfile = useRoomStore((s) => s.jurisdictionProfile);
  const payFrequency = useRoomStore((s) => s.payFrequency);
  const getSavingsTarget = useRoomStore((s) => s.getSavingsTarget);

  const enabledAccountTypes = useOnboardingStore((s) => s.selectedRegisteredAccounts);
  const currency = useOnboardingStore((s) => s.selectedCurrency);

  const syncGeneratedEvents = useNotificationsStore((s) => s.syncGeneratedEvents);
  const notificationPrefs = useNotificationsStore((s) => s.preferences);

  const taxYearId = React.useMemo(() => {
    if (!jurisdictionProfile) return null;
    return getCurrentTaxYearId(jurisdictionProfile.countryCode);
  }, [jurisdictionProfile?.countryCode]);

  const generated = React.useMemo(() => {
    return generateGeneratedEvents({
      assets,
      enabledAccountTypes,
      payFrequency,
      getSavingsTarget,
      currency,
      taxYearId,
      riskSummary: { overallRiskScore: risk.overallRiskScore, suggestions: risk.suggestions },
      notificationPrefs: {
        staleValuationReminders: notificationPrefs.staleValuationReminders,
        staleValuationDays: notificationPrefs.staleValuationDays,
      },
    });
  }, [assets, enabledAccountTypes, payFrequency, getSavingsTarget, currency, taxYearId, risk, notificationPrefs.staleValuationDays, notificationPrefs.staleValuationReminders]);

  // Apply auto-recurring contributions when due (best-effort; runs while app is open).
  React.useEffect(() => {
    const now = new Date();

    for (const asset of assets) {
      const recurring = asset.recurringContribution;
      if (!recurring?.enabled) continue;
      if (!recurring.autoApply) continue;
      if ((recurring.amount ?? 0) <= 0) continue;
      if (!Number.isFinite(asset.currentPrice) || asset.currentPrice <= 0) continue;

      const frequency = recurring.frequency;
      const weekday = recurring.weekday ?? now.getDay();

      let dueDate: Date;
      let occurrenceId: string;

      if (frequency === 'monthly') {
        const day = Math.max(1, Math.min(28, Math.floor(recurring.dayOfMonth ?? 1)));
        const dueThisMonth = dueDateForMonth({
          year: now.getFullYear(),
          monthIndex: now.getMonth(),
          dayOfMonth: day,
        });
        const currentMonthId = toMonthId(now);

        if (now.getTime() < dueThisMonth.getTime()) continue;
        if (recurring.lastAppliedId === currentMonthId) continue;

        dueDate = dueThisMonth;
        occurrenceId = currentMonthId;
      } else if (frequency === 'weekly') {
        const dueThisWeek = thisWeeksDueDate(weekday, now);
        const dueThisWeekId = toDateId(dueThisWeek);

        if (now.getTime() < dueThisWeek.getTime()) continue;
        if (recurring.lastAppliedId === dueThisWeekId) continue;

        dueDate = dueThisWeek;
        occurrenceId = dueThisWeekId;
      } else {
        const lastAppliedId = recurring.lastAppliedId;
        const lastAppliedDate = lastAppliedId ? new Date(lastAppliedId) : null;

        if (lastAppliedDate && !Number.isNaN(lastAppliedDate.getTime())) {
          const base = new Date(lastAppliedDate);
          base.setHours(9, 0, 0, 0);
          const next = new Date(base);
          next.setDate(next.getDate() + 14);
          dueDate = next;
          occurrenceId = toDateId(next);
        } else {
          const dueThisWeek = thisWeeksDueDate(weekday, now);
          const dueThisWeekId = toDateId(dueThisWeek);
          dueDate = dueThisWeek;
          occurrenceId = dueThisWeekId;
        }

        if (now.getTime() < dueDate.getTime()) continue;
        if (recurring.lastAppliedId === occurrenceId) continue;
      }

      applyAssetContribution({
        assetId: asset.id,
        amount: recurring.amount,
        date: now.toISOString(),
      });
      updateAsset(asset.id, {
        recurringContribution: {
          ...recurring,
          lastAppliedId: occurrenceId,
        },
      });
    }
  }, [assets, applyAssetContribution, updateAsset]);

  React.useEffect(() => {
    syncGeneratedEvents(generated);
  }, [syncGeneratedEvents, generated]);

  return React.useCallback(() => {
    syncGeneratedEvents(generated);
  }, [syncGeneratedEvents, generated]);
}
