"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const previewClassName = [
  "min-h-80 break-words p-5 text-base leading-relaxed",
  "[&_a]:text-primary [&_a]:underline",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:pl-4",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1",
  "[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold",
  "[&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold",
  "[&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_hr]:my-4 [&_hr]:border-border [&_li]:my-1",
  "[&_ol]:mb-3 [&_ol]:ml-6 [&_ol]:list-decimal",
  "[&_p]:mb-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent",
  "[&_table]:my-4 [&_table]:block [&_table]:overflow-x-auto",
  "[&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2",
  "[&_ul]:mb-3 [&_ul]:ml-6 [&_ul]:list-disc",
  "[&_.task-list-item]:list-none",
].join(" ");

export function RichNoteBody({
  body, onChange, preview, onPreviewChange,
}: {
  body: string;
  onChange: (body: string) => void;
  preview: boolean;
  onPreviewChange: (preview: boolean) => void;
}) {
  return <div className="overflow-hidden rounded-2xl border border-input bg-background">
    <div className="flex gap-2 border-b border-border bg-card p-2">
      <Button type="button" size="sm" variant={!preview ? "default" : "ghost"} aria-pressed={!preview} onClick={() => onPreviewChange(false)}>Markdown</Button>
      <Button type="button" size="sm" variant={preview ? "default" : "ghost"} aria-pressed={preview} onClick={() => onPreviewChange(true)}>Pregled</Button>
    </div>
    {preview ? <div className={previewClassName}>
      {body ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown> : <p className="text-muted-foreground">Beleška je prazna.</p>}
    </div> : <Textarea
      aria-label="Sadržaj beleške u Markdown formatu"
      value={body}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Piši Markdown ovde…"
      className="min-h-80 resize-y rounded-none border-0 p-5 font-mono text-sm shadow-none focus-visible:ring-0"
    />}
  </div>;
}
