import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { NewLoanView } from "./NewLoanView";

export const metadata: Metadata = { title: "New loan" };

export default function NewLoanPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewLoanView />
    </Suspense>
  );
}
