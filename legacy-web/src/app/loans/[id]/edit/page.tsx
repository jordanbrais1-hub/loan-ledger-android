import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoanForm } from "@/components/LoanForm";
import { PageHeader } from "@/components/ui";
import { getLoan, getPeople } from "@/lib/queries";

export const metadata: Metadata = { title: "Edit loan" };

export default async function EditLoanPage({ params }: PageProps<"/loans/[id]/edit">) {
  const id = Number((await params).id);
  const [loan, people] = await Promise.all([Number.isInteger(id) ? getLoan(id) : null, getPeople()]);
  if (!loan) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit loan" back={{ href: `/loans/${loan.id}`, label: "Back to loan" }} />
      <LoanForm loan={loan} peopleNames={people.map((p) => p.name)} />
    </div>
  );
}
