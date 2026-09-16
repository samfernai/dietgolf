import { notFound, redirect } from "next/navigation";
import { currentPlayer } from "@/lib/auth";
import HolePlayer from "@/components/HolePlayer";
import { dayIndexFromSlug } from "@/lib/golf/course";
import { currentWeekKey, loadCard } from "@/lib/game";

export const dynamic = "force-dynamic";

export default async function HolePage({ params }: { params: Promise<{ day: string }> }) {
  const player = await currentPlayer();
  if (!player) redirect("/join");

  const { day } = await params;
  const index = dayIndexFromSlug(day);
  if (index === null) notFound();

  const card = await loadCard(player, currentWeekKey());
  return <HolePlayer card={card} dayIndex={index} />;
}
