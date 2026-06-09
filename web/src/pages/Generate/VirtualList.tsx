/**
 * Minimal fixed-height-row virtual list.
 *
 * Built in-tree rather than pulled from react-window because the
 * dependency-graph cost wasn't worth it for ~50 LOC of straightforward
 * windowing. Scales to ~1M rows before requestAnimationFrame becomes
 * the bottleneck.
 *
 * Layout strategy: a fixed-height outer Box scrolls, an inner Box has
 * `paddingTop` equal to (firstVisibleIndex * itemHeight) and
 * `paddingBottom` equal to (offscreenAfter * itemHeight). Only the
 * visible window of rows actually renders.
 */
import { Box, SxProps, Theme } from "@mui/material";
import { ReactNode, useCallback, useState } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  /** Container height in px or any CSS length. */
  height: number | string;
  /** Render one row. The wrapper applies the absolute height. */
  renderRow: (item: T, index: number) => ReactNode;
  /** Number of rows to render beyond the visible window in each
   *  direction so fast scrolling doesn't show blank space. */
  overscan?: number;
  /** sx for the outer scrolling container. */
  sx?: SxProps<Theme>;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderRow,
  overscan = 5,
  sx,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  // Resolve numeric viewport height for the slice math. If a non-numeric
  // height is passed (e.g. "60vh") we approximate from the real element
  // height after mount via a ref-callback measurement.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const effectiveHeight =
    typeof height === "number" ? height : measuredHeight ?? 400;

  // Callback ref — runs once on mount with the real DOM node, lets us
  // size against the actual rendered container regardless of CSS
  // length units. Avoids mutating a useRef object (TS complains about
  // the read-only `.current` when typed strictly).
  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && typeof height !== "number" && measuredHeight === null) {
        setMeasuredHeight(el.clientHeight);
      }
    },
    [height, measuredHeight],
  );

  const visibleCount = Math.ceil(effectiveHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    startIndex + visibleCount + overscan * 2,
  );
  const padTop = startIndex * itemHeight;
  const padBottom = Math.max(0, (items.length - endIndex) * itemHeight);

  return (
    <Box
      ref={setContainerRef}
      onScroll={(e) =>
        setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)
      }
      sx={{
        height,
        overflowY: "auto",
        overflowX: "hidden",
        ...sx,
      }}
    >
      <Box style={{ paddingTop: padTop, paddingBottom: padBottom }}>
        {items.slice(startIndex, endIndex).map((item, i) => (
          <Box
            key={startIndex + i}
            style={{ height: itemHeight, boxSizing: "border-box" }}
          >
            {renderRow(item, startIndex + i)}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
