
-- Drop and re-add all company_id foreign keys with ON DELETE CASCADE
ALTER TABLE public.agent_entries DROP CONSTRAINT agent_entries_company_id_fkey,
  ADD CONSTRAINT agent_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.app_settings DROP CONSTRAINT app_settings_company_id_fkey,
  ADD CONSTRAINT app_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.attendance DROP CONSTRAINT attendance_company_id_fkey,
  ADD CONSTRAINT attendance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_settings DROP CONSTRAINT attendance_settings_company_id_fkey,
  ADD CONSTRAINT attendance_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_company_id_fkey,
  ADD CONSTRAINT audit_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.biometric_credentials DROP CONSTRAINT biometric_credentials_company_id_fkey,
  ADD CONSTRAINT biometric_credentials_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.commodities DROP CONSTRAINT commodities_company_id_fkey,
  ADD CONSTRAINT commodities_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.daily_summaries DROP CONSTRAINT daily_summaries_company_id_fkey,
  ADD CONSTRAINT daily_summaries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.debt_payments DROP CONSTRAINT debt_payments_company_id_fkey,
  ADD CONSTRAINT debt_payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.debts DROP CONSTRAINT debts_company_id_fkey,
  ADD CONSTRAINT debts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.end_of_day_log DROP CONSTRAINT end_of_day_log_company_id_fkey,
  ADD CONSTRAINT end_of_day_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.expenses DROP CONSTRAINT expenses_company_id_fkey,
  ADD CONSTRAINT expenses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.message_recipients DROP CONSTRAINT message_recipients_company_id_fkey,
  ADD CONSTRAINT message_recipients_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT messages_company_id_fkey,
  ADD CONSTRAINT messages_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.persistent_stock DROP CONSTRAINT persistent_stock_company_id_fkey,
  ADD CONSTRAINT persistent_stock_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT profiles_company_id_fkey,
  ADD CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.rate_change_history DROP CONSTRAINT rate_change_history_company_id_fkey,
  ADD CONSTRAINT rate_change_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.recruited_workers DROP CONSTRAINT recruited_workers_company_id_fkey,
  ADD CONSTRAINT recruited_workers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.role_permissions DROP CONSTRAINT role_permissions_company_id_fkey,
  ADD CONSTRAINT role_permissions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.salary_payments DROP CONSTRAINT salary_payments_company_id_fkey,
  ADD CONSTRAINT salary_payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.sales_entries DROP CONSTRAINT sales_entries_company_id_fkey,
  ADD CONSTRAINT sales_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.savings_accounts DROP CONSTRAINT savings_accounts_company_id_fkey,
  ADD CONSTRAINT savings_accounts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.savings_transactions DROP CONSTRAINT savings_transactions_company_id_fkey,
  ADD CONSTRAINT savings_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.stock_adjustments DROP CONSTRAINT stock_adjustments_company_id_fkey,
  ADD CONSTRAINT stock_adjustments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.vip_entries DROP CONSTRAINT vip_entries_company_id_fkey,
  ADD CONSTRAINT vip_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.workers DROP CONSTRAINT workers_company_id_fkey,
  ADD CONSTRAINT workers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
