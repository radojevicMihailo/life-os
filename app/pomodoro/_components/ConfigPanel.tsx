"use client";

import { usePomodoro } from "@/lib/pomodoro/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.floor(n))));
        }}
        className="w-24"
      />
    </div>
  );
}

export function ConfigPanel() {
  const {
    state,
    pendingConfig,
    setConfig,
    notifyEnabled,
    setNotify,
    requestNotificationPermission,
  } = usePomodoro();

  const cfg = pendingConfig ?? state.config;
  const hasPending = pendingConfig !== null;

  const canEnableNotifications =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission !== "denied";

  return (
    <div className="mt-6 grid gap-4 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium">Settings</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NumberField
          id="work-min"
          label="Work (min)"
          value={cfg.workMin}
          min={1}
          max={180}
          onChange={(n) => setConfig({ workMin: n })}
        />
        <NumberField
          id="short-min"
          label="Short break (min)"
          value={cfg.shortMin}
          min={1}
          max={60}
          onChange={(n) => setConfig({ shortMin: n })}
        />
        <NumberField
          id="long-min"
          label="Long break (min)"
          value={cfg.longMin}
          min={1}
          max={60}
          onChange={(n) => setConfig({ longMin: n })}
        />
        <NumberField
          id="cycles"
          label="Cycles until long"
          value={cfg.cyclesUntilLong}
          min={2}
          max={12}
          onChange={(n) => setConfig({ cyclesUntilLong: n })}
        />
      </div>
      {hasPending && (
        <p className="text-xs text-muted-foreground">
          Changes apply to the next phase.
        </p>
      )}
      <div className="flex items-center gap-3">
        {canEnableNotifications && !notifyEnabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void requestNotificationPermission()}
          >
            Enable notifications
          </Button>
        )}
        {notifyEnabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setNotify(false)}
          >
            Disable notifications
          </Button>
        )}
      </div>
    </div>
  );
}
