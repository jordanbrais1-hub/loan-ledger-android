"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LoanList } from "@/components/LoanList";
import { PersonForm } from "@/components/PersonForm";
import { Card, Loading, NotFoundState, PageHeader, StatCard, buttonClass } from "@/components/ui";
import { deletePerson } from "@/lib/actions";
import { amountLines, amountsSign, formatAmounts } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLoans, getPerson, totals } from "@/lib/queries";
import { newLoanHref, parseId } from "@/lib/routes";

export function PersonView() {
  const id = parseId(useSearchParams().get("id"));
  const router = useRouter();
  const data = useLiveQuery(() => (id ? Promise.all([getPerson(id), getLoans(id)]) : null), [id]);
  if (data === undefined) return <Loading />;
  const [person, loans] = data ?? [null, []];
  if (!person) return <NotFoundState />;

  const { owedToMe, iOwe, net } = totals(loans);
  const netSign = amountsSign(net);

  return (
    <>
      <PageHeader
        title={person.name}
        back={{ href: "/people", label: t("People") }}
        subtitle={
          netSign > 0
            ? t("{name} owes you {amount} overall", { name: person.name, amount: formatAmounts(net) })
            : netSign < 0
              ? t("You owe {name} {amount} overall", { name: person.name, amount: formatAmounts(net, { abs: true }) })
              : amountLines(net).length > 1
                ? t("Net per currency: {amount}", { amount: formatAmounts(net) })
                : t("You're all settled up")
        }
        actions={
          <>
            <Link href={newLoanHref(person.name)} className={buttonClass.primary}>
              {t("+ New loan")}
            </Link>
            <ConfirmButton
              action={async () => {
                router.push("/people");
                await deletePerson(person.id);
              }}
              title={t("Delete {name}?", { name: person.name })}
              message={t("This permanently deletes {name} and all {n} of their loans and payments.", {
                name: person.name,
                n: loans.length,
              })}
            >
              {t("Delete")}
            </ConfirmButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("They owe me")} value={amountLines(owedToMe)} tone="green" />
        <StatCard label={t("I owe them")} value={amountLines(iOwe)} tone="red" />
        <StatCard label={t("Net")} value={amountLines(net)} tone={netSign > 0 ? "green" : netSign < 0 ? "red" : "neutral"} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("Loans")}</h2>
          {loans.length ? (
            <LoanList loans={loans} showPerson={false} />
          ) : (
            <Card className="p-5 text-sm text-slate-500 dark:text-slate-400">{t("No loans with {name}.", { name: person.name })}</Card>
          )}
        </section>
        <aside>
          <PersonForm key={person.id} person={person} />
        </aside>
      </div>
    </>
  );
}
