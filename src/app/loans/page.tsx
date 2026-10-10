import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { LoansView } from "./LoansView";

export const metadata: Metadata = { title: "Loans" };

export default function LoansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoansView />
    </Suspense>
  );
}
