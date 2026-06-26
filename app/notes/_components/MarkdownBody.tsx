"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateNote } from "../_actions/notes";

export function MarkdownBody({ id, initialBody }: { id: string; initialBody: string }) {
  const [body, setBody] = useState(initialBody);
  const [preview, setPreview] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onChange(value: string) {
    setBody(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const r = await updateNote({ id, body: value });
        if (!r.ok) toast.error(r.error);
      });
    }, 600);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
          {preview ? "Edit" : "Preview"}
        </Button>
      </div>
      {preview ? (
        <div className="prose prose-sm max-w-none dark:prose-invert rounded-md border p-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || "_Nothing yet_"}</ReactMarkdown>
        </div>
      ) : (
        <Textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write markdown…"
          className="min-h-[300px] font-mono text-sm"
        />
      )}
    </div>
  );
}
