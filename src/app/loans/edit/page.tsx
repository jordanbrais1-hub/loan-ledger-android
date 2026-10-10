import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { EditLoanView } from "./EditLoanView";

export const metadata: Metadata = { title: "Edit loan" };

export default function EditLoanPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditLoanView />
    </Suspense>
  );
}
