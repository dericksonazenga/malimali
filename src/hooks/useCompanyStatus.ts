import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const GRACE_DAYS = 10;
const BILLING_CYCLE_DAYS = 30;

export interface CompanyStatus {
  loading: boolean;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string | null;
  /** Days remaining in 10-day data-entry grace period when deactivated. Null when active. */
  daysLeft: number | null;
  /** True only when deactivated AND grace period has expired. */
  gracePeriodExpired: boolean;
  /** Next billing date (rolling 30-day from creation). */
  nextBillingDate: Date | null;
}

export function computeNextBilling(createdAt: string): Date {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const cycles = Math.floor(diffMs / (BILLING_CYCLE_DAYS * 86400_000)) + 1;
  return new Date(created.getTime() + cycles * BILLING_CYCLE_DAYS * 86400_000);
}

function computeDaysLeft(deactivatedAt: string): number {
  const start = new Date(deactivatedAt).getTime();
  const elapsedMs = Date.now() - start;
  const elapsedDays = elapsedMs / 86400_000;
  return Math.max(0, Math.ceil(GRACE_DAYS - elapsedDays));
}

export function useCompanyStatus(): CompanyStatus {
  const { companyId, isSystemAdmin } = useAuth();
  const [state, setState] = useState<CompanyStatus>({
    loading: true,
    isActive: true,
    deactivatedAt: null,
    createdAt: null,
    daysLeft: null,
    gracePeriodExpired: false,
    nextBillingDate: null,
  });

  useEffect(() => {
    if (!companyId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let cancelled = false;

    const apply = (row: any) => {
      if (!row || cancelled) return;
      const isActive = !!row.is_active;
      const deactivatedAt = row.deactivated_at ?? null;
      const createdAt = row.created_at ?? null;
      const daysLeft = !isActive && deactivatedAt ? computeDaysLeft(deactivatedAt) : null;
      const gracePeriodExpired = !isActive && deactivatedAt ? daysLeft === 0 : false;
      const nextBillingDate = createdAt ? computeNextBilling(createdAt) : null;
      setState({
        loading: false,
        isActive,
        deactivatedAt,
        createdAt,
        daysLeft,
        gracePeriodExpired,
        nextBillingDate,
      });
    };

    const fetchStatus = async () => {
      const { data } = await supabase
        .from("companies")
        .select("is_active, deactivated_at, created_at")
        .eq("id", companyId)
        .maybeSingle();
      apply(data);
    };

    fetchStatus();

    // Recompute countdown every minute.
    const tick = setInterval(() => {
      setState((s) => {
        if (s.isActive || !s.deactivatedAt) return s;
        const daysLeft = computeDaysLeft(s.deactivatedAt);
        return { ...s, daysLeft, gracePeriodExpired: daysLeft === 0 };
      });
    }, 60_000);

    const channel = supabase
      .channel(`company-status-${companyId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "companies", filter: `id=eq.${companyId}` },
        (payload: any) => apply(payload.new),
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [companyId, isSystemAdmin]);

  return state;
}
