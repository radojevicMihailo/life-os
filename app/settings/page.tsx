import { Bell, Settings2 } from "lucide-react";
import { NotificationControls } from "@/app/notifications/NotificationControls";

export default function SettingsPage() {
  return <div className="mx-auto max-w-2xl space-y-8">
    <header className="space-y-2">
      <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight"><Settings2 className="size-6 text-primary" />Podešavanja</h1>
      <p className="text-sm text-muted-foreground">Prilagodi Life OS i podsetnike na svojim uređajima.</p>
    </header>
    <section aria-labelledby="notifications-title" className="space-y-4">
      <h2 id="notifications-title" className="flex items-center gap-2 text-lg font-semibold"><Bell className="size-5" />Notifikacije</h2>
      <p className="text-sm text-muted-foreground">Podsetnici za zadatke i izabrane Google kalendare, čak i kada aplikacija nije otvorena.</p>
      <NotificationControls />
    </section>
  </div>;
}
