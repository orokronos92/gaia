import { redirect } from "next/navigation";

/** Le référentiel des gammes est le seul construit : on y entre directement. */
export default function ReferentielsPage() {
  redirect("/referentiels/gammes");
}
