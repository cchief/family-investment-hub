"use client";
import { useRouter } from "next/navigation";

export function MarkReadButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-secondary"
      onClick={async () => {
        await fetch("/api/notifications/mark-read", { method: "POST" });
        router.refresh();
      }}
    >
      Mark all as read
    </button>
  );
}
