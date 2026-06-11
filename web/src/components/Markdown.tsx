/**
 * Markdown — a single MUI-themed react-markdown wrapper used wherever
 * we want translators (or future copy edits) to be able to reach for
 * **bold**, *italic*, `inline code`, ordered/unordered lists, links,
 * or fenced code blocks without us extending a hand-written renderer.
 *
 * Why one shared component instead of inlining ReactMarkdown each
 * time:
 *   - Styling stays consistent — every list, every <code>, every link
 *     looks the same across Home, About, the Generate steps, etc.
 *     One place to retune visual rhythm if the brand evolves.
 *   - Markdown parsing config (allowed plugins, link target, line-
 *     break behaviour) is set once instead of being duplicated.
 *   - i18n strings stay clean — they're just markdown; the component
 *     handles the React mapping.
 *
 * Variants:
 *   - "body" (default): paragraphs render as MUI body1, text.secondary,
 *     ~1.7 line-height. Used for explanatory prose.
 *   - "compact": shrinks paragraph margins + uses body2. Used inside
 *     tight surfaces like Alerts where the default rhythm would feel
 *     loud.
 *
 * Newline policy: i18n strings should use proper markdown syntax —
 *   - Numbered steps:  `1. …\n2. …\n3. …`  (renders as <ol>)
 *   - Bullet lists:    `- …\n- …`            (renders as <ul>)
 *   - Paragraph break: blank line between paragraphs (`\n\n`)
 *   - Inline code:     `` `…` ``
 *   - Bold / italic:   `**…**` / `*…*`
 *   - Code block:      triple-backtick fences (rare in our copy)
 *
 * If you need a soft line break inside a paragraph, end the line with
 * two spaces — standard CommonMark. We deliberately don't pull in
 * `remark-breaks` to convert lone `\n` to `<br>`, because that
 * encourages translators to write paragraphs as bare newline-separated
 * lines and lose the structure we get from real markdown lists.
 */
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Box, Link as MuiLink, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface MarkdownProps {
  /** The markdown source to render. */
  children: string;
  /** Visual density. "body" is the default; "compact" tightens spacing. */
  variant?: "body" | "compact";
  /** Wrapper sx overrides. Merged after the component's defaults. */
  sx?: SxProps<Theme>;
  /**
   * Open links in a new tab. Default true (we mostly link out to
   * upstream docs / repos). Set to false for in-app navigation.
   */
  openLinksInNewTab?: boolean;
}

/** Inline `code` styling. Matches the look used by Home.tsx pre-markdown. */
const inlineCodeSx: SxProps<Theme> = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.9em",
  px: 0.6,
  py: 0.1,
  borderRadius: 0.5,
  bgcolor: "action.hover",
  color: "text.primary",
};

/**
 * Fenced code block styling. Block-level: explicit padding, full-width
 * background, monospace stack. Differs from inline by being a block
 * surface — the original `pre` `<code>` shape from react-markdown is
 * preserved so syntax-highlighter integrations can be slotted in later
 * by overriding just `code` in a consumer.
 */
const codeBlockSx: SxProps<Theme> = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.875rem",
  p: 1.5,
  borderRadius: 1,
  bgcolor: "action.hover",
  color: "text.primary",
  overflowX: "auto",
  // `pre` defaults to its own margin in browsers; align with the
  // surrounding paragraph rhythm so a code block doesn't visually
  // detach from the step it explains.
  my: 1.5,
  // Preserve whitespace + soft-wrap long URLs / commands so a code
  // block on a phone doesn't force horizontal scroll for trivial
  // overflow.
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  "& code": {
    // Inside a pre, the inline `code` styling above is too noisy —
    // strip the background and inherit the block's typography.
    bgcolor: "transparent",
    p: 0,
    fontSize: "inherit",
  },
};

const Markdown = ({
  children,
  variant = "body",
  sx,
  openLinksInNewTab = true,
}: MarkdownProps) => {
  const isCompact = variant === "compact";

  // Per-element renderers. Each maps a markdown element to its MUI
  // equivalent so the rendered tree picks up the theme's typography +
  // colour automatically.
  const components: Components = {
    // Paragraphs. body1 by default, body2 in compact mode. Bottom
    // margin gets the spacing rhythm — last-of-type clears it so the
    // wrapper doesn't trail empty space.
    p: ({ children }) => (
      <Typography
        variant={isCompact ? "body2" : "body1"}
        color="text.secondary"
        sx={{
          mb: isCompact ? 1 : 1.5,
          lineHeight: 1.7,
          "&:last-child": { mb: 0 },
        }}
      >
        {children}
      </Typography>
    ),
    // Headings inside a markdown blob are rare in our copy (we
    // typically wrap a heading in its own MUI <Typography variant="h4">
    // OUTSIDE the markdown) but support them anyway so a translator
    // can use `## Section` and get sensible output rather than a raw
    // `<h2>`.
    h1: ({ children }) => (
      <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
        {children}
      </Typography>
    ),
    h2: ({ children }) => (
      <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
        {children}
      </Typography>
    ),
    h3: ({ children }) => (
      <Typography variant="h6" sx={{ mt: 1.5, mb: 0.5 }}>
        {children}
      </Typography>
    ),
    // Ordered + unordered lists. We do NOT make each <li> a
    // Typography — that breaks list bullets in Safari (it wraps the
    // marker in its own pseudo-box). Instead style the <li> via the
    // parent list's `& li` selector.
    ol: ({ children }) => (
      <Box
        component="ol"
        sx={{
          pl: 3,
          m: 0,
          mb: isCompact ? 1 : 1.5,
          color: "text.secondary",
          "& li": {
            mb: isCompact ? 0.5 : 1,
            lineHeight: 1.7,
            fontSize: isCompact ? "0.875rem" : "1rem",
            "&:last-child": { mb: 0 },
          },
          "&:last-child": { mb: 0 },
        }}
      >
        {children}
      </Box>
    ),
    ul: ({ children }) => (
      <Box
        component="ul"
        sx={{
          pl: 3,
          m: 0,
          mb: isCompact ? 1 : 1.5,
          color: "text.secondary",
          "& li": {
            mb: isCompact ? 0.5 : 1,
            lineHeight: 1.7,
            fontSize: isCompact ? "0.875rem" : "1rem",
            "&:last-child": { mb: 0 },
          },
          "&:last-child": { mb: 0 },
        }}
      >
        {children}
      </Box>
    ),
    // Inline code vs fenced code block — react-markdown 10 doesn't
    // expose an `inline` prop any more. Detect block via the
    // `language-xxx` class that fenced blocks emit (inline backticks
    // don't carry a className). Block content stays inside the
    // outer `<pre>` so the existing rendering tree is preserved for
    // future syntax-highlighter integrations.
    code: ({ className, children }) => {
      const isBlock = Boolean(className);
      if (isBlock) {
        // Keep the original `<code class="language-xxx">` shape so a
        // future syntax-highlighter plugin can swap in without
        // touching this layer. Block visual styling lives on the
        // surrounding `<pre>` (see the `pre` renderer below).
        return <code className={className}>{children}</code>;
      }
      return (
        <Box component="code" sx={inlineCodeSx}>
          {children}
        </Box>
      );
    },
    pre: ({ children }) => (
      <Box component="pre" sx={codeBlockSx}>
        {children}
      </Box>
    ),
    // Links. Default to opening external links in a new tab — we
    // mostly cite upstream docs, repos, blog posts. In-app routes
    // should be wired through React Router by the caller (pass
    // openLinksInNewTab=false and provide a `<Link as RouterLink>`
    // upstream instead of using markdown for those).
    a: ({ href, children }) => (
      <MuiLink
        href={href}
        underline="hover"
        target={openLinksInNewTab ? "_blank" : undefined}
        rel={openLinksInNewTab ? "noopener noreferrer" : undefined}
        sx={{ fontWeight: 500 }}
      >
        {children}
      </MuiLink>
    ),
    // Emphasis: bold lifts text.primary so it pops out of the
    // text.secondary paragraph colour. Italic stays the same colour.
    strong: ({ children }) => (
      <Box component="strong" sx={{ fontWeight: 700, color: "text.primary" }}>
        {children}
      </Box>
    ),
    em: ({ children }) => (
      <Box component="em" sx={{ fontStyle: "italic" }}>
        {children}
      </Box>
    ),
    // Horizontal rule — subtle, themed.
    hr: () => (
      <Box
        component="hr"
        sx={{
          border: 0,
          borderTop: 1,
          borderColor: "divider",
          my: 2,
        }}
      />
    ),
  };

  return (
    <Box sx={sx}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </Box>
  );
};

export default Markdown;

// Re-export the props type so consumers can spread sx through.
export type { MarkdownProps };

// Helper: nothing-renderer-yet. If you ever need to render markdown
// as plain text (e.g. for aria-labels), this gives you a stable
// no-op string.
export const stripMarkdown = (src: string): ReactNode => src;
