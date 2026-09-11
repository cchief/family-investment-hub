import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function RootPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  redirect(role === "ADMIN" ? "/admin" : "/dashboard");
}
