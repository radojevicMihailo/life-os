import { NotificationControls } from "./NotificationControls";
export default function NotificationsPage() {
  return <div className="mx-auto max-w-2xl space-y-6">
    <h1 className="text-2xl font-semibold tracking-tight">Notifikacije</h1>
    <p className="text-muted-foreground">Life OS podsetnici za zadatke i izabrane Google kalendare, čak i kada aplikacija nije otvorena.</p>
    <NotificationControls />
  </div>;
}
