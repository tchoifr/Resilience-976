/* global console */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(rootDir, 'docs/product/raf-action-plan.md');
const outputPath = path.join(rootDir, 'docs/product/raf-action-plan.pdf');

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const inlineMarkdown = (value) => {
  const codeSegments = [];
  const withCodePlaceholders = escapeHtml(value).replace(/`([^`]+)`/g, (_, code) => {
    const id = `@@CODE_${codeSegments.length}@@`;
    codeSegments.push(`<code>${code}</code>`);
    return id;
  });

  const withBold = withCodePlaceholders.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  return codeSegments.reduce(
    (rendered, segment, index) => rendered.replace(`@@CODE_${index}@@`, segment),
    withBold,
  );
};

const closeList = (html, state) => {
  if (state.inList) {
    html.push('</ul>');
    state.inList = false;
  }
};

const markdownToHtml = (markdown) => {
  const html = [];
  const state = { inList: false };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList(html, state);
      continue;
    }

    if (trimmed.startsWith('<section') || trimmed === '</section>') {
      closeList(html, state);
      html.push(trimmed);
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList(html, state);
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      if (!state.inList) {
        html.push('<ul>');
        state.inList = true;
      }
      html.push(`<li>${inlineMarkdown(trimmed.slice(2).replace(/;$/, ''))}</li>`);
      continue;
    }

    closeList(html, state);
    html.push(`<p>${inlineMarkdown(trimmed.replace(/\s{2,}$/, ''))}</p>`);
  }

  closeList(html, state);
  return html.join('\n');
};

const pageCss = `
  @page {
    size: A4;
    margin: 17mm 16mm;
  }

  * {
    box-sizing: border-box;
  }

  html {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    margin: 0;
    color: #172033;
    background: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11.5pt;
    line-height: 1.48;
  }

  h1,
  h2,
  h3,
  p,
  ul {
    margin-top: 0;
  }

  h1 {
    color: #0f172a;
    font-size: 24pt;
    margin-bottom: 6mm;
    padding-bottom: 4mm;
    border-bottom: 2px solid #d7dee8;
  }

  h2 {
    color: #111827;
    font-size: 16pt;
    margin: 8mm 0 3mm;
  }

  h3 {
    color: #14532d;
    font-size: 13.5pt;
    margin-bottom: 3mm;
  }

  p {
    margin-bottom: 3.5mm;
  }

  ul {
    padding-left: 5.5mm;
    margin-bottom: 3.5mm;
  }

  li {
    margin: 1.6mm 0;
  }

  code {
    border: 1px solid #dbe3ee;
    border-radius: 4px;
    background: #f6f8fb;
    color: #243041;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 9.5pt;
    padding: 0.35mm 1mm;
  }

  section {
    break-inside: avoid;
  }

  section[style] {
    margin: 6mm 0 !important;
    padding: 5mm !important;
    border: 1px solid #86efac !important;
    border-left: 5px solid #16a34a !important;
    border-radius: 7px !important;
    background: #ecfdf5 !important;
  }

  section[style] strong {
    display: inline-block;
    margin-bottom: 2mm;
    padding: 1.2mm 2.5mm;
    border: 1px solid #86efac;
    border-radius: 999px;
    color: #166534;
    background: #dcfce7;
    font-size: 9.5pt;
    letter-spacing: 0;
  }
`;

const markdown = await fs.readFile(sourcePath, 'utf8');
const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Plan d'action RAF</title>
    <style>${pageCss}</style>
  </head>
  <body>
    ${markdownToHtml(markdown)}
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: outputPath,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();

console.log(`PDF genere: ${path.relative(rootDir, outputPath)}`);
