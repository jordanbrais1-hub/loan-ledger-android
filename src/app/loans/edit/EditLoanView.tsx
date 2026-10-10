"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams } from "next/navigation";
import { LoanForm } from "@/components/LoanForm";
import { Loading, NotFoundState, PageHeader } from "@/components/ui";
import { getLoan, getPeople } from "@/lib/queries";
import { loanHref, parseId } from "@/lib/routes";

export function EditLoanView() {
  const id = parseId(useSearchParams().get("id"));
  const data = useLiveQuery(() => Promise.all([id ? getLoan(id) : null, getPeople()]), [id]);
  if (!data) return <Loading />;
  const [loan, people] = data;
  if (!loan) return <NotFoundState />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit loan" back={{ href: loanHref(loan.id), label: "Back to loan" }} />
      <LoanForm key={loan.id} loan={loan} peopleNames={people.map((p) => p.name)} />
    </div>
  );
}
