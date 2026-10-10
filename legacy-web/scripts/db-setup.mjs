// Applies db/schema.sql to the database in DATABASE_URL.
// Usage: npm run db:setup   (add --seed to insert sample data)
import { readFile } from "node:fs/promises";
import pg from "pg";

process.loadEnvFile?.(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await client.query(schema);
  console.log("Schema applied.");

  if (process.argv.includes("--seed")) {
    const { rows } = await client.query("SELECT count(*)::int AS n FROM loans");
    if (rows[0].n > 0) {
      console.log("Loans already exist; skipping seed.");
    } else {
      await client.query(`
        WITH p AS (
          INSERT INTO people (name, phone) VALUES
            ('Maria Lopez', '555-0101'), ('Carlos Ruiz', NULL), ('Ana Torres', '555-0177')
          RETURNING id, name
        ), l AS (
          INSERT INTO loans (person_id, direction, principal, interest_rate, start_date, due_date, description)
          SELECT id, d.direction, d.principal, d.rate, CURRENT_DATE - d.ago, CURRENT_DATE + d.due, d.descr
          FROM p JOIN (VALUES
            ('Maria Lopez', 'lent',     500.00, 0,   60,  30,  'Car repair'),
            ('Carlos Ruiz', 'borrowed', 1200.00, 5,  120, -10, 'Laptop'),
            ('Ana Torres',  'lent',     250.00, 0,   20,  5,   'Concert tickets')
          ) AS d(name, direction, principal, rate, ago, due, descr) ON d.name = p.name
          RETURNING id, description
        )
        INSERT INTO payments (loan_id, amount, paid_on, method)
        SELECT id, x.amount, CURRENT_DATE - x.ago, x.method
        FROM l JOIN (VALUES
          ('Car repair', 150.00, 30, 'Cash'),
          ('Laptop',     300.00, 60, 'Bank transfer'),
          ('Laptop',     300.00, 15, 'Bank transfer')
        ) AS x(descr, amount, ago, method) ON x.descr = l.description;
      `);
      console.log("Sample data inserted.");
    }
  }
} finally {
  await client.end();
}
