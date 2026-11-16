create unique index if not exists payment_submissions_instapay_reference_unique
on public.payment_submissions (lower(btrim(customer_reference)))
where method='instapay' and customer_reference is not null and btrim(customer_reference)<>'';
