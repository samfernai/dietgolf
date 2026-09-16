import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/auth";
import JoinForm from "./JoinForm";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  if (await currentPlayer()) redirect("/play");
  const { mode } = await searchParams;
  return <JoinForm initialMode={mode === "signin" ? "signin" : "register"} />;
}
