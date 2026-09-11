import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export interface AppSessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  memberId: string | null;
}

export async function getSession() {
  return getServerSession(authOptions);
}

/** Call at the top of a Server Component / route handler that requires any signed-in user. */
export async function requireUser(): Promise<AppSessionUser> {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session.user as unknown as AppSessionUser;
}

/** Call at the top of admin-only pages and API routes. */
export async function requireAdmin(): Promise<AppSessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Call at the top of member-only pages. */
export async function requireMember(): Promise<AppSessionUser> {
  const user = await requireUser();
  if (user.role !== "MEMBER" || !user.memberId) redirect("/admin");
  return user;
}
