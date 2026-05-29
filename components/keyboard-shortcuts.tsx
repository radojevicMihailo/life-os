"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pendingG = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;

      if (pendingG.current) {
        let target: string | null = null;
        if (e.key === "d") target = "/";
        else if (e.key === "t") target = "/tasks";
        else if (e.key === "p") target = "/projects";
        else if (e.key === "c") target = "/context";
        else if (e.key === "r") target = "/priorities";
        pendingG.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        return;
      }

      if (e.key === "g") {
        pendingG.current = true;
        gTimer.current = setTimeout(() => {
          pendingG.current = false;
        }, 1200);
        return;
      }

      if (e.key === "/") {
        const input = document.querySelector<HTMLInputElement>('input[placeholder^="Add a task"]');
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
