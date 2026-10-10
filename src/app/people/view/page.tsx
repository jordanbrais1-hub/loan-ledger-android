import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { PersonView } from "./PersonView";

export const metadata: Metadata = { title: "Person" };

export default function PersonPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PersonView />
    </Suspense>
  );
}
