/** Shared stylesheet copied to `dist/style.css` on build. */
export const SITE_CSS = `:root {
  color-scheme: light;
  --text: #1a1a1a;
  --link: #0b57d0;
  --muted: #555;
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--text);
  max-width: 42rem;
  margin: 2rem auto;
  padding: 0 1.25rem;
}

a {
  color: var(--link);
}

main h1 {
  font-size: 1.75rem;
  line-height: 1.25;
}

.lesson h1 {
  margin-top: 0;
}

.lesson h2 {
  margin-top: 1.75rem;
  font-size: 1.2rem;
}

.lesson ul,
.lesson ol {
  padding-left: 1.35rem;
}

.lesson li {
  margin-bottom: 0.35rem;
}

.site-nav {
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.site-nav a {
  text-decoration: none;
}

.site-nav a:hover {
  text-decoration: underline;
}

.index-intro {
  color: var(--muted);
}

@media print {
  body {
    max-width: none;
    margin: 0;
    padding: 0.5in;
    font-size: 11pt;
  }

  .site-nav,
  .index-intro {
    display: none !important;
  }

  a {
    color: var(--text);
    text-decoration: none;
  }

  .lesson h2 {
    break-after: avoid;
  }
}
`;
