-- Applied to production A after explicit owner approval on 2026-10-18.
-- Local clone passed 7/7; production readback unique/ready/valid all true.
-- Run outside a transaction. CONCURRENTLY keeps normal order writes on.
-- No existing order/payment/user row is updated or removed.
CREATE UNIQUE INDEX CONCURRENTLY orders_sepay_transaction_id_unique
ON public.orders ((btrim(sepay_transaction_id)))
WHERE nullif(btrim(sepay_transaction_id), '') IS NOT NULL;
