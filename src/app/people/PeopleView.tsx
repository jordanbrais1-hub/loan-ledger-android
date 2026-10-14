"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { Card, EmptyState, Loading, PageHeader, buttonClass } from "@/components/ui";
import { amountLines, amountsSign } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLoans, getPeople, totals } from "@/lib/queries";
import { personHref } from "@/lib/routes";

export function PeopleView() {
  const data = useLiveQuery(() => Promise.all([getPeople(), getLoans()]), []);
  if (!data) return <Loading />;
  const [people, loans] = data;

  if (people.length === 0) {
    return (
      <>
        <PageHeader title={t("People")} />
        <EmptyState
          title={t("No people yet")}
          message={t("People are added automatically when you create a loan.")}
          action={
            <Link href="/loans/new" className={buttonClass.primary}>
              {t("+ Add a loan")}
            </Link>
          }
        />
      </>
    );
  }

  const rows = people.map((person) => {
    const theirLoans = loans.filter((l) => l.person_id === person.id);
    const open = theirLoans.filter((l) => l.summary.status !== "paid");
    const { net } = totals(theirLoans);
    return { person, net, sign: amountsSign(net), loanCount: theirLoans.length, openCount: open.length };
  });

  return (
    <>
      <PageHeader title={t("People")} subtitle={t("Everyone you lend to or borrow from, and where you stand with each.")} />
      <Card className="divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
        {rows.map(({ person, net, sign, loanCount, openCount }) => (
          <Link
            key={person.id}
            href={personHref(person.id)}
            className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-800/50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {person.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{person.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {loanCount === 1 ? t("1 loan") : t("{n} loans", { n: loanCount })} · {t("{n} open", { n: openCount })}
              </p>
            </div>
            <div className="text-right">
              {amountLines(net, { abs: sign !== 0 }).map((line) => (
                <p
                  key={line}
                  className={`font-semibold tabular-nums ${
                    sign > 0 ? "text-emerald-600 dark:text-emerald-400" : sign < 0 ? "text-rose-600 dark:text-rose-400" : ""
                  }`}
                >
                  {line}
                </p>
              ))}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sign > 0
                  ? t("owes you")
                  : sign < 0
                    ? t("you owe")
                    : amountLines(net).length > 1
                      ? t("net, per currency")
                      : t("all settled")}
              </p>
            </div>
          </Link>
        ))}
      </Card>
    </>
  );
}
