-- Backfill payment_status for 2 orders that were paid via PayFast but never had payment_status updated
UPDATE public.orders SET payment_status = 'paid' WHERE id IN (
  'dcbb92c6-d791-4050-914f-184e9b6b7575',
  'e75a0c67-f332-44e4-bc9b-c65fcf947d32'
) AND payment_status = 'pending';