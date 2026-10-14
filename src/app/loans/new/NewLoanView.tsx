"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams } from "next/navigation";
import { LoanForm } from "@/components/LoanForm";
import { Loading, PageHeader } from "@/components/ui";
import { t } from "@/lib/i18n";
import { getPeople } from "@/lib/queries";

export function NewLoanView() {
  const person = useSearchParams().get("person") ?? undefined;
  const people = useLiveQuery(() => getPeople(), []);
  if (!people) return <Loading />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("New loan")}
        subtitle={t("Write it down once — we'll do the math.")}
        back={{ href: "/loans", label: t("Loans") }}
      />
      <LoanForm peopleNames={people.map((p) => p.name)} defaultPerson={person} />
    </div>
  );
}
