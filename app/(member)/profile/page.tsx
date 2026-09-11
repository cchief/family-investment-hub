import { requireMember } from "@/lib/session";
import { getMember } from "@/lib/repo/members";
import { ProfileForm } from "./ProfileForm";
import { formatUGX, monthLabel } from "@/lib/currency";

export default async function ProfilePage() {
  const user = await requireMember();
  const member = getMember(user.memberId!)!;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Profile</h1>
        <p className="text-ink/50 text-sm mt-1">Your membership details. Contact an administrator to change your commitment or status.</p>
      </div>

      <div className="card p-5 space-y-3">
        <Row label="Member ID" value={member.member_code} />
        <Row label="Full Name" value={member.full_name} />
        <Row label="Email" value={member.email} />
        <Row label="Join Date" value={new Date(member.join_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
        <Row label="Monthly Commitment" value={formatUGX(member.monthly_commitment)} />
        <Row label="Status" value={member.status} />
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold text-ink mb-3">Update contact details</h2>
        <ProfileForm phone={member.phone ?? ""} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-ink/45">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
