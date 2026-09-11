"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({ phone }: { phone: string }) {
  const router = useRouter();
  const [value, setValue] = useState(phone);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        await fetch("/api/profile", { method: "POST", body: JSON.stringify({ phone: value }) });
        setLoading(false);
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }}
    >
      <input className="input" placeholder="Phone number" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn btn-primary shrink-0" disabled={loading}>{saved ? "Saved ✓" : loading ? "Saving…" : "Save"}</button>
    </form>
  );
}
