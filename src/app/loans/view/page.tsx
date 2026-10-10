import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { LoanView } from "./LoanView";

export const metadata: Metadata = { title: "Loan" };

export default function LoanPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoanView />
    </Suspense>
  );
}
