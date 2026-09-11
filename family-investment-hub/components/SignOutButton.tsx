"use client";
import { signOut } from "next-auth/react";

export function SignOutButton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs font-semibold text-ink/50">
        Sign out
      </button>
    );
  }
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full text-left px-2 py-1.5 text-xs font-semibold text-ink/50 hover:text-bad transition rounded-lg"
    >
      Sign out
    </button>
  );
}
