"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { calendarDays, dayValue, localDay, localTime, parseLocalDay, withinBounds, type DateInputType } from "@/lib/date-picker";

const locale = "sr-Latn-RS";
const focusStyle = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const smallButton = cn("inline-flex h-8 items-center justify-center rounded-lg px-2 text-xs transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none", focusStyle);

/** Keeps a real native input for React change events, browser validation and FormData. */
export function DateTimeInput({ type, className, value: controlledValue, defaultValue, ref: forwardedRef, ...props }: React.ComponentProps<"input"> & { type: DateInputType }) {
  const initialValue = String(controlledValue ?? defaultValue ?? "");
  const [uncontrolledValue, setUncontrolledValue] = React.useState(initialValue);
  const value = controlledValue === undefined ? uncontrolledValue : String(controlledValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => parseLocalDay(initialValue) ?? new Date());
  const [focusedDay, setFocusedDay] = React.useState(() => initialValue.slice(0, 10));
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const timeId = React.useId();
  const nativeId = React.useId();
  const popupId = React.useId();
  const selectedDay = parseLocalDay(value);
  const time = (type === "time" ? value : value.split("T")[1]) || "";
  const hours = time.slice(0, 2);
  const minutes = time.slice(3, 5);
  const disabled = props.disabled || props.readOnly;

  React.useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!form) return;
    const reset = () => {
      setUncontrolledValue(String(defaultValue ?? ""));
      setOpen(false);
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue]);

  function commit(next: string) {
    if (disabled || (next && !withinBounds(next, props.min, props.max))) return;
    const input = inputRef.current;
    if (!input) return;
    // Bypass React's value tracker so the native bubbling input event produces
    // the same onChange event as typing into an input (including target.name).
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (controlledValue === undefined) setUncontrolledValue(next);
  }

  function onOpenChange(next: boolean) {
    if (disabled) return;
    if (next) {
      const date = selectedDay ?? new Date();
      setMonth(date);
      setFocusedDay(localDay(date));
    }
    setOpen(next);
  }

  function chooseDay(date: Date) {
    commit(dayValue(date, type, value, props.min, props.max));
    setFocusedDay(localDay(date));
    if (type === "date") setOpen(false);
  }

  function changeTime(hour: string, minute: string) {
    const nextTime = `${hour || localTime(new Date()).slice(0, 2)}:${minute || "00"}`;
    let next = type === "time" ? nextTime : `${value.slice(0, 10) || localDay(parseLocalDay(String(props.min ?? "")) ?? new Date())}T${nextTime}`;
    if (props.min && next < String(props.min)) next = String(props.min);
    if (props.max && next > String(props.max)) next = String(props.max);
    commit(next);
  }

  function calendarKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const date = parseLocalDay(focusedDay) ?? selectedDay ?? new Date();
    if (event.key in offsets) date.setDate(date.getDate() + offsets[event.key]);
    else if (event.key === "Home") date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    else if (event.key === "End") date.setDate(date.getDate() + 6 - (date.getDay() + 6) % 7);
    else if (event.key === "PageUp" || event.key === "PageDown") date.setMonth(date.getMonth() + (event.key === "PageUp" ? -1 : 1), 1);
    else return;
    event.preventDefault();
    const next = localDay(date);
    setMonth(date);
    setFocusedDay(next);
    requestAnimationFrame(() => calendarRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
  }

  let display = props.placeholder || (type === "time" ? "Izaberite vreme" : type === "datetime-local" ? "Izaberite datum i vreme" : "Izaberite datum");
  if (type === "time" && time) display = time;
  else if (selectedDay) {
    display = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(selectedDay);
    if (type === "datetime-local" && time) display += ` · ${time}`;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <div className="relative min-w-0 flex-1">
        <input
          {...props}
          id={nativeId}
          ref={(node) => {
            inputRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          type={type}
          value={controlledValue === undefined ? undefined : controlledValue}
          defaultValue={controlledValue === undefined ? defaultValue : undefined}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onFocus={() => triggerRef.current?.focus()}
          onInvalid={(event) => {
            props.onInvalid?.(event);
            event.preventDefault();
            setOpen(true);
            triggerRef.current?.focus();
          }}
          onChange={(event) => {
            if (controlledValue === undefined) setUncontrolledValue(event.currentTarget.value);
            props.onChange?.(event);
          }}
        />
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            id={props.id}
            type="button"
            role="combobox"
            aria-controls={popupId}
            aria-expanded={open}
            aria-autocomplete="none"
            aria-readonly={props.readOnly}
            disabled={props.disabled}
            aria-label={props["aria-label"]}
            aria-labelledby={props["aria-labelledby"]}
            aria-describedby={props["aria-describedby"]}
            aria-invalid={props["aria-invalid"]}
            aria-required={props.required}
            title={props.title}
            className={cn("flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive", focusStyle, className)}
          >
            {type === "time" ? <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" /> : <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className={cn("truncate", !value && "text-muted-foreground")}>{display}</span>
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent id={popupId} align="start" className="w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-4 shadow-xl" onOpenAutoFocus={(event) => {
        if (type !== "time") {
          event.preventDefault();
          requestAnimationFrame(() => calendarRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusedDay}"]`)?.focus());
        }
      }}>
        {type !== "time" && <>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className={smallButton} aria-label="Prethodni mesec" onClick={() => { const next = new Date(month.getFullYear(), month.getMonth() - 1, 1, 12); setMonth(next); setFocusedDay(localDay(next)); }}><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold capitalize" aria-live="polite">{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month)}</span>
            <button type="button" className={smallButton} aria-label="Sledeći mesec" onClick={() => { const next = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12); setMonth(next); setFocusedDay(localDay(next)); }}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground" aria-hidden="true">{["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"].map(day => <span key={day} className="py-1">{day}</span>)}</div>
          <div ref={calendarRef} className="grid grid-cols-7 gap-1" role="group" aria-label="Kalendar" onKeyDown={calendarKey}>
            {calendarDays(month).map(date => {
              const day = localDay(date);
              const selected = day === value.slice(0, 10);
              const allowed = withinBounds(dayValue(date, type, value, props.min, props.max), props.min, props.max);
              return <button key={day} type="button" data-day={day} tabIndex={day === focusedDay ? 0 : -1} aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(date)} aria-pressed={selected} aria-disabled={!allowed} onFocus={() => setFocusedDay(day)} onClick={() => { if (allowed) chooseDay(date); }} className={cn("aspect-square rounded-lg text-sm transition-colors hover:bg-muted", focusStyle, date.getMonth() !== month.getMonth() && "text-muted-foreground/50", !allowed && "opacity-25 cursor-not-allowed", day === localDay(new Date()) && "ring-1 ring-primary/40", selected && "bg-primary font-semibold text-primary-foreground hover:bg-primary/90")}>{date.getDate()}</button>;
            })}
          </div>
        </>}
        {type !== "date" && <div className={cn("flex items-center gap-3", type === "datetime-local" && "mt-2 border-t border-border pt-3")}>
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          <span className="mr-auto text-sm font-medium">Vreme</span>
          <div className="flex items-center gap-1">
            <label className="sr-only" htmlFor={`${timeId}-hours`}>Sati</label>
            <select id={`${timeId}-hours`} value={hours} onChange={event => changeTime(event.target.value, minutes)} className={cn("h-10 rounded-lg border border-input bg-background px-2 text-sm tabular-nums", focusStyle)}><option value="" disabled>--</option>{Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")).map(hour => <option key={hour} value={hour}>{hour}</option>)}</select>
            <span className="text-muted-foreground">:</span>
            <label className="sr-only" htmlFor={`${timeId}-minutes`}>Minuti</label>
            <select id={`${timeId}-minutes`} value={minutes} onChange={event => changeTime(hours, event.target.value)} className={cn("h-10 rounded-lg border border-input bg-background px-2 text-sm tabular-nums", focusStyle)}><option value="" disabled>--</option>{Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")).map(minute => <option key={minute} value={minute}>{minute}</option>)}</select>
          </div>
        </div>}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
          <button type="button" className={cn(smallButton, "text-primary")} disabled={!withinBounds(type === "time" ? localTime(new Date()) : dayValue(new Date(), type, value, props.min, props.max), props.min, props.max)} onClick={() => { if (type === "time") commit(localTime(new Date())); else chooseDay(new Date()); }}>{type === "time" ? "Sada" : "Danas"}</button>
          <button type="button" className={cn(smallButton, "text-muted-foreground")} disabled={!value} onClick={() => { commit(""); setOpen(false); }}>Obriši</button>
          {type !== "date" && <button type="button" className={cn(smallButton, "bg-primary px-3 text-primary-foreground hover:bg-primary/90")} onClick={() => setOpen(false)}>Gotovo</button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
