"use client";
import { useEffect, useState } from "react";
import type { Witness } from "../../studio/types";

export default function Source({
  path,
  text,
  witnesses,
}: {
  path: string;
  text: string;
  witnesses: Witness[];
}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let alive = true;
    setHtml("");
    void import("./highlight")
      .then((m) => m.highlight(text, path, witnesses))
      .then((value) => {
        if (alive) setHtml(value);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path, text, witnesses]);
  // Shiki escapes source text. Repository HTML is never inserted directly.
  return html ? (
    <div
      className="source-highlight"
      tabIndex={0}
      aria-label={`Source of ${path}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <pre tabIndex={0} aria-label={`Source of ${path}`}>
      {text}
    </pre>
  );
}
