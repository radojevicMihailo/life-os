import type { TransactionTypeColor } from "@/db/schema/finance";

type ColorStyle = {
  label: string;
  badge: string;
  swatch: string;
  trigger: string;
};

const STYLES: Record<TransactionTypeColor, ColorStyle> = {
  red: {
    label: "Red",
    badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
    swatch: "bg-rose-500",
    trigger: "border-rose-300 text-rose-700 dark:text-rose-300",
  },
  green: {
    label: "Green",
    badge:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    swatch: "bg-emerald-500",
    trigger: "border-emerald-300 text-emerald-700 dark:text-emerald-300",
  },
  yellow: {
    label: "Yellow",
    badge:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    swatch: "bg-amber-500",
    trigger: "border-amber-300 text-amber-800 dark:text-amber-300",
  },
  blue: {
    label: "Blue",
    badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
    swatch: "bg-sky-500",
    trigger: "border-sky-300 text-sky-700 dark:text-sky-300",
  },
  gray: {
    label: "Gray",
    badge:
      "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800",
    swatch: "bg-zinc-500",
    trigger: "border-zinc-300 text-zinc-700 dark:text-zinc-300",
  },
  purple: {
    label: "Purple",
    badge:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
    swatch: "bg-violet-500",
    trigger: "border-violet-300 text-violet-700 dark:text-violet-300",
  },
  orange: {
    label: "Orange",
    badge:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
    swatch: "bg-orange-500",
    trigger: "border-orange-300 text-orange-700 dark:text-orange-300",
  },
  pink: {
    label: "Pink",
    badge: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-900",
    swatch: "bg-pink-500",
    trigger: "border-pink-300 text-pink-700 dark:text-pink-300",
  },
};

export function colorStyle(color: string | null | undefined): ColorStyle {
  const key = (color ?? "gray") as TransactionTypeColor;
  return STYLES[key] ?? STYLES.gray;
}
