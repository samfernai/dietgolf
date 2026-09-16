import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/auth";
import { slugForDay } from "@/lib/golf/course";
import { dayIndex, today } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  if (!(await currentPlayer())) redirect("/join");
  redirect(`/play/${slugForDay(dayIndex(today()))}`);
}
