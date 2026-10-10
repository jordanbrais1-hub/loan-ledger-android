-- Loan Ledger schema. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS people (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS people_name_lower_idx ON people (lower(name));

CREATE TABLE IF NOT EXISTS loans (
  id             SERIAL PRIMARY KEY,
  person_id      INTEGER NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  -- 'lent': they owe me. 'borrowed': I owe them.
  direction      TEXT NOT NULL CHECK (direction IN ('lent', 'borrowed')),
  principal      NUMERIC(14, 2) NOT NULL CHECK (principal > 0),
  -- Simple annual interest rate, in percent (e.g. 5 = 5%/year). 0 = no interest.
  interest_rate  NUMERIC(7, 3) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  start_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  description    TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loans_person_idx ON loans (person_id);

CREATE TABLE IF NOT EXISTS payments (
  id          SERIAL PRIMARY KEY,
  loan_id     INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  paid_on     DATE NOT NULL DEFAULT CURRENT_DATE,
  method      TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_loan_idx ON payments (loan_id);
