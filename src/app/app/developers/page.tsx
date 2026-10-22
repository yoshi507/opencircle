import { listMyApps } from "@/app/actions/bots";
import { DevelopersClient } from "@/components/developers-client";

export default async function DevelopersPage() {
  const apps = await listMyApps();
  return <DevelopersClient initialApps={apps as any} />;
}
