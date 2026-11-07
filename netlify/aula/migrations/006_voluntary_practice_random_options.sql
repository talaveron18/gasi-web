-- F3 completion: optional practice without completion gate and per-attempt option ordering.
ALTER TABLE aula_units ADD COLUMN allows_voluntary_practice boolean NOT NULL DEFAULT false;
ALTER TABLE aula_test_attempts ADD COLUMN option_orders jsonb NOT NULL DEFAULT '{}'::jsonb
 CHECK(jsonb_typeof(option_orders)='object');
