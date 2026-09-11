import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { one } from "./db";

export interface AppUserRow {
  id: string;
  email: string;
  password_hash: string;
  role: "ADMIN" | "MEMBER";
  is_active: number;
}

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h session
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = one<AppUserRow>(`SELECT * FROM users WHERE email = :email`, {
          email: credentials.email.trim().toLowerCase(),
        });
        if (!user || !user.is_active) return null;
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        let memberId: string | null = null;
        let fullName = user.email;
        if (user.role === "MEMBER") {
          const member = one<{ id: string; full_name: string }>(
            `SELECT id, full_name FROM members WHERE user_id = :userId`,
            { userId: user.id }
          );
          memberId = member?.id ?? null;
          fullName = member?.full_name ?? user.email;
        } else {
          const admin = one<{ full_name: string }>(
            `SELECT m.full_name FROM members m WHERE m.user_id = :userId`,
            { userId: user.id }
          );
          fullName = admin?.full_name ?? "Administrator";
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          memberId,
          name: fullName,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.memberId = (user as any).memberId;
        token.uid = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid as string;
        (session.user as any).role = token.role as string;
        (session.user as any).memberId = token.memberId as string | null;
      }
      return session;
    },
  },
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
