import Image from "next/image";
import { cn } from "@/lib/utils";

/** Decorative beside the Life OS wordmark; the SVG is also the app icon source. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/icon.svg"
      width={64}
      height={64}
      alt=""
      aria-hidden="true"
      className={cn("size-10 shrink-0 rounded-xl", className)}
    />
  );
}
