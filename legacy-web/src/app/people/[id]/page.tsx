import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePerson } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LoanList } from "@/components/LoanList";
import { PersonForm } from "@/components/PersonForm";
import { Card, PageHeader, StatCard, buttonClass } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { getLoans, getPerson, totals } from "@/lib/queries";

export const metadata: Metadata = { title: "Person" };

export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [person, loans] = await Promise.all([getPerson(id), getLoans(id)]);
  if (!person) notFound();

  const { owedToMe, iOwe, net } = totals(loans);

  return (
    <>
      <PageHeader
        title={person.name}
        back={{ href: "/people", label: "People" }}
        subtitle={
          net > 0
            ? `${person.name} owes you ${formatMoney(net)} overall`
            : net < 0
              ? `You owe ${person.name} ${formatMoney(-net)} overall`
              : "You're all settled up"
        }
        actions={
          <>
            <Link href={`/loans/new?person=${encodeURIComponent(person.name)}`} className={buttonClass.primary}>
              + New loan
            </Link>
            <ConfirmButton
              action={deletePerson.bind(null, person.id)}
              title={`Delete ${person.name}?`}
              message={`This permanently deletes ${person.name} and all ${loans.length} of their loans and payments.`}
            >
              Delete
            </ConfirmButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="They owe me" value={formatMoney(owedToMe)} tone="green" />
        <StatCard label="I owe them" value={formatMoney(iOwe)} tone="red" />
        <StatCard label="Net" value={formatMoney(net)} tone={net > 0 ? "green" : net < 0 ? "red" : "neutral"} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Loans</h2>
          {loans.length ? (
            <LoanList loans={loans} showPerson={false} />
          ) : (
            <Card className="p-5 text-sm text-slate-500 dark:text-slate-400">No loans with {person.name}.</Card>
          )}
        </section>
        <aside>
          <PersonForm person={person} />
        </aside>
      </div>
    </>
  );
}
