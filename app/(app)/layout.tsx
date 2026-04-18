import type { JSX } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QueueSyncer } from "@/components/system/QueueSyncer";
import { SwRegister } from "@/components/system/SwRegister";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <QueueSyncer />
      <SwRegister />
      {children}
    </>
  );
}
