/**
 * RFC 4180 quoting. A comma or a quote inside a name must not shift every
 * following column.
 */
function quote(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(quote).join(",")];
  for (const row of rows) lines.push(row.map(quote).join(","));
  // Excel on Windows needs CRLF, and a BOM to read Bangla correctly.
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
