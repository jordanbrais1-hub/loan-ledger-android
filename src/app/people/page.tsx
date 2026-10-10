import type { Metadata } from "next";
import { PeopleView } from "./PeopleView";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return <PeopleView />;
}
