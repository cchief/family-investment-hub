import { getAllSettings } from "@/lib/repo/settings";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const settings = getAllSettings();
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">System Settings</h1>
        <p className="text-ink/50 text-sm mt-1">Contribution limits and deadlines applied fund-wide.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
