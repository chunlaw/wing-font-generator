/**
 * Step 2 — editable mappings list.
 *
 * The mapping CSV can be ~140K rows for a full Cantonese set, which
 * means: virtualisation is required (we'd otherwise mount 280K+ DOM
 * nodes for a TextField per row), search must be debounced, and edits
 * must be O(1) per keystroke. State lives in GenerateContext so step
 * navigation doesn't blow away unsaved changes.
 *
 * Each row supports inline edit (click → fields become editable),
 * delete, and a top-of-list "add row" panel. CSV import replaces the
 * whole list; CSV export serialises the current state.
 */
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Add,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import {
  ChangeEvent,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
import { BUILT_IN_MAPPINGS } from "../../../utils/wingfontPresets";
import { MappingRow } from "../types";

// Two row heights — phones get taller rows because we stack the data
// onto two lines (chars + actions on top, annos + weight below). The
// 4-column desktop grid would otherwise overflow a 360-wide viewport.
// react-window needs a numeric itemSize known at render time, so the
// component computes the right height once per breakpoint flip.
const ROW_HEIGHT_DESKTOP = 56;
const ROW_HEIGHT_MOBILE = 88;

/**
 * Bundle of everything a virtualised row needs. Passed to react-window
 * as `itemData` so the RowRenderer can stay declared at module scope
 * (hoisted out of the component body) and be properly memoizable.
 */
interface RowItemData {
  rows: MappingRow[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  updateMapping: (id: string, patch: Partial<Omit<MappingRow, "id">>) => void;
  requestDelete: (id: string) => void;
  isMobile: boolean;
}

/**
 * react-window RowRenderer. Receives `{index, style, data}`; the
 * `style` prop carries the absolute positioning react-window computed
 * for this row and MUST be applied to our outer element, otherwise
 * every row stacks at (0, 0).
 *
 * memo'd because react-window calls this on every scroll frame; the
 * cells inside (TextField, IconButton) are not cheap to rebuild
 * unnecessarily.
 */
const RowRenderer = memo(function RowRenderer({
  index,
  style,
  data,
}: ListChildComponentProps<RowItemData>) {
  const row = data.rows[index];
  if (!row) return null;
  return (
    <div style={style}>
      <Row
        row={row}
        isEditing={data.editingId === row.id}
        isMobile={data.isMobile}
        onStartEdit={() => data.setEditingId(row.id)}
        onStopEdit={() => data.setEditingId(null)}
        onChange={(patch) => data.updateMapping(row.id, patch)}
        onDelete={() => data.requestDelete(row.id)}
      />
    </div>
  );
});

const Step2Mappings = () => {
  const { t } = useTranslation();
  const {
    mappings,
    updateMapping,
    deleteMapping,
    clearMappings,
    addMapping,
    loadMappingsFromCsvText,
    loadBuiltInMappings,
    exportMappingsAsCsv,
    mappingsPresetKey,
    baseFont,
    annoFont,
  } = useGenerate();

  const [search, setSearch] = useState("");
  // useDeferredValue debounces the filter for free without us picking a
  // debounce-window number. The user sees their typed character
  // immediately, the list updates on the next frame.
  const deferredSearch = useDeferredValue(search);

  // Whether the user has expanded the "missing characters" details
  // panel below the coverage Alert. Default collapsed because for a
  // mapping with a few hundred missing chars, dumping them all
  // immediately would dominate the screen.
  const [coverageExpanded, setCoverageExpanded] = useState(false);

  /**
   * Coverage check: which characters in the user's mappings aren't in
   * the loaded fonts' cmaps. Only computed when we have both fonts'
   * coverage sets cached AND at least one mapping row to check.
   *
   * Why bake the membership into a Set per font upfront (in
   * GenerateContext's extractGlyphCoverage): this useMemo runs every
   * time `mappings` changes, and `mappings` can be 137k rows. Doing
   * a per-row, per-char Set.has() against pre-computed sets is
   * O(total chars) — typically a few hundred thousand lookups,
   * which is fast (<50ms even on a phone). Re-parsing the font with
   * opentype.js for each render would block for hundreds of ms.
   *
   * Output: { baseMissing, annoMissing } where each is a sorted
   * deduplicated array of single-character strings (the characters
   * that the user's mapping references but the font doesn't cover).
   * We cap the display at ~50 chars but the array is uncapped so
   * the totals are accurate.
   */
  const coverage = useMemo(() => {
    if (
      !baseFont.glyphCoverage ||
      !annoFont.glyphCoverage ||
      mappings.length === 0
    ) {
      return null;
    }
    const baseSet = baseFont.glyphCoverage;
    const annoSet = annoFont.glyphCoverage;
    const baseMissing = new Set<string>();
    const annoMissing = new Set<string>();
    let baseTotal = 0;
    let annoTotal = 0;
    const seenBase = new Set<string>();
    const seenAnno = new Set<string>();
    for (const row of mappings) {
      // Base side: every codepoint in `chars` must be in baseSet.
      // Iterate via for-of so surrogate pairs are walked as one
      // grapheme (not two UTF-16 code units), and use codePointAt(0)
      // which returns the full codepoint regardless of plane.
      for (const ch of row.chars) {
        if (seenBase.has(ch)) continue;
        seenBase.add(ch);
        baseTotal++;
        const cp = ch.codePointAt(0);
        if (cp !== undefined && !baseSet.has(cp)) {
          baseMissing.add(ch);
        }
      }
      // Anno side: split on whitespace (the CSV uses spaces between
      // per-character annotations like "ngan4 hong4") then walk each
      // visible character. Spaces themselves are separators, not text
      // that needs to render, so we drop them.
      for (const ch of row.annos.replace(/\s/g, "")) {
        if (seenAnno.has(ch)) continue;
        seenAnno.add(ch);
        annoTotal++;
        const cp = ch.codePointAt(0);
        if (cp !== undefined && !annoSet.has(cp)) {
          annoMissing.add(ch);
        }
      }
    }
    // Sort by codepoint for stable, predictable display. Could also
    // sort by frequency in the mapping but that requires a second
    // pass and isn't obviously more useful.
    return {
      baseMissing: [...baseMissing].sort(),
      annoMissing: [...annoMissing].sort(),
      baseTotal,
      annoTotal,
    };
  }, [mappings, baseFont.glyphCoverage, annoFont.glyphCoverage]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Phone-width vs everything else. The mapping table needs different
  // row heights AND a different visual layout per breakpoint; we route
  // both through this single flag.
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const rowHeight = isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP;

  // Filter on lowercased substring match across chars + annos.
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return mappings;
    return mappings.filter(
      (r) =>
        r.chars.toLowerCase().includes(q) ||
        r.annos.toLowerCase().includes(q),
    );
  }, [mappings, deferredSearch]);

  // react-window's FixedSizeList keeps its scroll position when its
  // itemCount shrinks, which means after the user scrolls to the bottom
  // and then types a search query that filters down to a few rows, the
  // viewport stays scrolled past the new content — looks broken. Reset
  // to the top whenever the filter (or the underlying mappings) changes.
  //
  // `useRef<T>(null)` produces a RefObject<T> (the read-only flavour)
  // which is what JSX `ref` props want. Using <FixedSizeList<RowItemData>>
  // makes the generic match the list element below; that match matters
  // because React refs are invariant in T.
  const listRef = useRef<FixedSizeList<RowItemData>>(null);
  useEffect(() => {
    listRef.current?.scrollTo(0);
  }, [deferredSearch, mappings]);

  // Bundle every per-row dependency into a single object passed via
  // itemData. react-window calls the RowRenderer with (index, style,
  // data); using itemData (instead of inline render closures) lets us
  // hoist RowRenderer out of the component body and have it be
  // properly memoizable.
  const rowItemData = useMemo<RowItemData>(
    () => ({
      rows: filtered,
      editingId,
      setEditingId,
      updateMapping,
      requestDelete: setPendingDelete,
      isMobile,
    }),
    [filtered, editingId, updateMapping, isMobile],
  );

  const handleImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        loadMappingsFromCsvText(text);
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : String(err));
      }
    },
    [loadMappingsFromCsvText],
  );

  const handleExport = useCallback(() => {
    const csv = exportMappingsAsCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mapping.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [exportMappingsAsCsv]);

  const handlePresetChange = useCallback(
    async (event: SelectChangeEvent<string>) => {
      const next = BUILT_IN_MAPPINGS.find((p) => p.key === event.target.value);
      if (!next) return;
      try {
        await loadBuiltInMappings(next);
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : String(err));
      }
    },
    [loadBuiltInMappings],
  );

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box>
        <Typography variant="h6">{t("step2.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("step2.description")}
        </Typography>
      </Box>

      {importError && <Alert severity="error">{importError}</Alert>}

      {/*
        Coverage validator.

        Only renders when BOTH font cmaps are cached AND there's at
        least one mapping row to check — otherwise there's nothing
        meaningful to say and the Alert would just be noise. Hidden
        entirely when every character is covered (the silent-success
        case): no "✓ Coverage OK" badge, because users who don't have
        a problem don't need a confirmation.

        When uncovered chars exist:
          - severity="warning" — not an error, the user can still
            generate; the missing chars will just render as .notdef
            (typically tofu boxes) in the output font.
          - First-line headline: per-side counts ("X chars in base
            column missing; Y chars in annotations missing"). Numbers
            only — saves vertical space.
          - Expand-on-click: shows the actual missing chars (capped at
            ~50 to avoid dumping 5,000 obscure CJK chars; the count
            is still accurate). The button label flips to "Hide".
       */}
      {coverage &&
        (coverage.baseMissing.length > 0 ||
          coverage.annoMissing.length > 0) && (
          <Alert
            severity="warning"
            variant="outlined"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setCoverageExpanded((v) => !v)}
              >
                {coverageExpanded
                  ? t("step2.coverage.hide")
                  : t("step2.coverage.show")}
              </Button>
            }
          >
            {/*
              Two per-font status lines. Showing BOTH lines (even when
              one side is fully covered) is deliberate: it visibly
              confirms that the validator ran for each font and tells
              the user where the actionable problem is.

              Status uses ✓ / ⚠ glyph plus a per-side missing/total
              count. The "all covered" case reads as a positive
              confirmation rather than an ambiguous "0/N".
            */}
            <Box>
              <Typography variant="body2">
                {coverage.baseMissing.length === 0
                  ? t("step2.coverage.baseOk").replace(
                      "{total}",
                      String(coverage.baseTotal),
                    )
                  : t("step2.coverage.baseMissing")
                      .replace(
                        "{missing}",
                        String(coverage.baseMissing.length),
                      )
                      .replace("{total}", String(coverage.baseTotal))}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25 }}>
                {coverage.annoMissing.length === 0
                  ? t("step2.coverage.annoOk").replace(
                      "{total}",
                      String(coverage.annoTotal),
                    )
                  : t("step2.coverage.annoMissing")
                      .replace(
                        "{missing}",
                        String(coverage.annoMissing.length),
                      )
                      .replace("{total}", String(coverage.annoTotal))}
              </Typography>
            </Box>
            {coverageExpanded && (
              <Box mt={1.5}>
                {coverage.baseMissing.length > 0 && (
                  <Box sx={{ mb: coverage.annoMissing.length > 0 ? 1 : 0 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      {t("step2.coverage.baseLabel")}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        // Use the base font's own visual rendering for
                        // the missing chars when possible — but most
                        // browsers will fall back to a system CJK font
                        // for chars the loaded font can't render
                        // anyway, which is exactly what we want here
                        // (the user CAN see the char to know what
                        // it is). Wrap in a fixed-width-friendly stack
                        // so the list doesn't read like prose.
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {coverage.baseMissing.slice(0, 50).join(" ")}
                      {coverage.baseMissing.length > 50 && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {" "}
                          {t("step2.coverage.andMore").replace(
                            "{n}",
                            String(coverage.baseMissing.length - 50),
                          )}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                )}
                {coverage.annoMissing.length > 0 && (
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      {t("step2.coverage.annoLabel")}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {coverage.annoMissing.slice(0, 50).join(" ")}
                      {coverage.annoMissing.length > 50 && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {" "}
                          {t("step2.coverage.andMore").replace(
                            "{n}",
                            String(coverage.annoMissing.length - 50),
                          )}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Alert>
        )}

      {/* Toolbar: import / preset picker / export / clear + count */}
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        rowGap={1}
        alignItems="center"
      >
        <Button variant="outlined" component="label" size="small">
          {t("step2.import.button")}
          <input hidden type="file" accept=".csv,text/csv" onChange={handleImport} />
        </Button>
        {/*
          Built-in mapping presets dropdown. Replaces the old single
          "use default" text button now that we ship multiple
          Cantonese romanizations + Cangjie. The value-binding uses
          empty-string as the sentinel for "Custom / no preset" (MUI
          Select can't bind to `null`); whenever the user edits or
          imports their own CSV, the context clears
          `mappingsPresetKey` to null which renders here as "".
        */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          {/*
            `shrink` on the InputLabel + `notched` on the Select
            (forwarded to its underlying OutlinedInput) are required
            because we use `displayEmpty` with an empty-string
            sentinel for the "Custom / no preset" state. Without
            both, MUI thinks the field is empty when
            mappingsPresetKey is null and lets the label slide back
            into the centre, where it overlaps the placeholder text
            our renderValue paints. Forcing shrink keeps the label
            in the notched-top position always.
          */}
          <InputLabel id="mappings-preset-label" shrink>
            {t("step2.import.preset")}
          </InputLabel>
          <Select
            labelId="mappings-preset-label"
            label={t("step2.import.preset")}
            value={mappingsPresetKey ?? ""}
            onChange={handlePresetChange}
            displayEmpty
            notched
            renderValue={(selected) => {
              if (!selected) return t("step2.import.presetCustom");
              const opt = BUILT_IN_MAPPINGS.find((p) => p.key === selected);
              return opt?.label ?? selected;
            }}
          >
            {BUILT_IN_MAPPINGS.map((preset) => (
              <MenuItem key={preset.key} value={preset.key}>
                {preset.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="text"
          size="small"
          onClick={handleExport}
          disabled={mappings.length === 0}
        >
          {t("step2.export.button")}
        </Button>
        <Button
          variant="text"
          size="small"
          color="warning"
          onClick={clearMappings}
          disabled={mappings.length === 0}
        >
          {t("step2.clear.button")}
        </Button>
        <Box flex={1} />
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          {t("step2.count", { count: mappings.length })}
        </Typography>
      </Stack>

      {/* Search + add */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder={t("step2.search.placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddOpen(true)}
          // Stop "新增一行" / "Add row" from wrapping vertically when
          // the search field next to it eats most of the row's width.
          // `flexShrink: 0` keeps the button at its content-natural
          // width; `whiteSpace: nowrap` is belt-and-braces in case some
          // ancestor sets it differently.
          sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
        >
          {t("step2.add.button")}
        </Button>
      </Stack>

      {/* Header row — hidden on mobile because the per-row cards label
          themselves inline (no shared column structure to align with). */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        {!isMobile && (
          <Box
            display="grid"
            gridTemplateColumns="2fr 3fr 1fr 96px"
            sx={{
              px: 1.5,
              py: 1,
              bgcolor: "action.hover",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Box>{t("step2.col.chars")}</Box>
            <Box>{t("step2.col.annos")}</Box>
            <Box>{t("step2.col.weight")}</Box>
            <Box />
          </Box>
        )}

        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            {mappings.length === 0
              ? t("step2.empty")
              : `No matches for "${search}"`}
          </Box>
        ) : (
          <FixedSizeList<RowItemData>
            ref={listRef}
            height={420}
            width="100%"
            itemCount={filtered.length}
            // itemSize changes based on breakpoint (88px stacked card
            // on phones, 56px row on desktop). react-window
            // recomputes layout when itemSize changes.
            itemSize={rowHeight}
            itemKey={(index, data) => data.rows[index]?.id ?? index}
            itemData={rowItemData}
            overscanCount={4}
          >
            {RowRenderer}
          </FixedSizeList>
        )}
      </Paper>

      <AddDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addMapping}
      />

      <Dialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        <DialogTitle>{t("step2.confirmDelete")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {(() => {
              const target = mappings.find((m) => m.id === pendingDelete);
              return target ? `${target.chars} → ${target.annos}` : "";
            })()}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              if (pendingDelete) deleteMapping(pendingDelete);
              setPendingDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface RowProps {
  row: MappingRow;
  isEditing: boolean;
  isMobile: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (patch: Partial<Omit<MappingRow, "id">>) => void;
  onDelete: () => void;
}

const Row = ({
  row,
  isEditing,
  isMobile,
  onStartEdit,
  onStopEdit,
  onChange,
  onDelete,
}: RowProps) => {
  // Edit/delete action buttons — shared between mobile + desktop.
  const actions = (
    <Box display="flex" justifyContent="flex-end" gap={0.5}>
      {isEditing ? (
        <IconButton size="small" onClick={onStopEdit}>
          <SaveIcon fontSize="small" />
        </IconButton>
      ) : (
        <IconButton size="small" onClick={onStartEdit}>
          <EditIcon fontSize="small" />
        </IconButton>
      )}
      <IconButton size="small" onClick={onDelete} color="warning">
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  if (isMobile) {
    // --- Mobile: stacked card-style row -----------------------------
    // Top line: chars (large, serif) + actions on the right
    // Bottom line: annos (monospace) + weight badge
    // Fits comfortably in a 360px-wide viewport with no horizontal scroll.
    return (
      <Box
        sx={{
          px: 1.5,
          py: 1,
          height: ROW_HEIGHT_MOBILE,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 0.5,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
          {isEditing ? (
            <TextField
              value={row.chars}
              onChange={(e) => onChange({ chars: e.target.value })}
              size="small"
              variant="standard"
              autoFocus
              sx={{ flex: 1 }}
            />
          ) : (
            <Box sx={{ fontSize: 20, fontFamily: "serif", flex: 1, minWidth: 0 }}>
              {row.chars}
            </Box>
          )}
          {actions}
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {isEditing ? (
            <TextField
              value={row.annos}
              onChange={(e) => onChange({ annos: e.target.value })}
              size="small"
              variant="standard"
              sx={{ flex: 1 }}
            />
          ) : (
            <Box
              sx={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                color: "text.secondary",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.annos}
            </Box>
          )}
          {isEditing ? (
            <TextField
              value={row.weight ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                onChange({ weight: v === "" ? undefined : Number(v) });
              }}
              size="small"
              variant="standard"
              type="number"
              sx={{ width: 60 }}
            />
          ) : (
            <Box
              sx={{
                color: "text.secondary",
                fontSize: 11,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: "action.hover",
                flexShrink: 0,
              }}
            >
              ⚖ {row.weight ?? "—"}
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // --- Desktop: 4-column grid (unchanged from before) -------------
  return (
    <Box
      display="grid"
      gridTemplateColumns="2fr 3fr 1fr 96px"
      alignItems="center"
      sx={{
        px: 1.5,
        height: ROW_HEIGHT_DESKTOP,
        borderBottom: 1,
        borderColor: "divider",
        gap: 1,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {isEditing ? (
        <TextField
          value={row.chars}
          onChange={(e) => onChange({ chars: e.target.value })}
          size="small"
          variant="standard"
          autoFocus
        />
      ) : (
        <Box sx={{ fontSize: 18, fontFamily: "serif" }}>{row.chars}</Box>
      )}
      {isEditing ? (
        <TextField
          value={row.annos}
          onChange={(e) => onChange({ annos: e.target.value })}
          size="small"
          variant="standard"
        />
      ) : (
        <Box sx={{ fontFamily: "ui-monospace, monospace", fontSize: 14 }}>
          {row.annos}
        </Box>
      )}
      {isEditing ? (
        <TextField
          value={row.weight ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange({ weight: v === "" ? undefined : Number(v) });
          }}
          size="small"
          variant="standard"
          type="number"
        />
      ) : (
        <Box sx={{ color: "text.secondary", fontSize: 13 }}>
          {row.weight ?? "—"}
        </Box>
      )}
      {actions}
    </Box>
  );
};

interface AddDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (row: Omit<MappingRow, "id">) => void;
}

const AddDialog = ({ open, onClose, onAdd }: AddDialogProps) => {
  const { t } = useTranslation();
  const [chars, setChars] = useState("");
  const [annos, setAnnos] = useState("");
  const [weight, setWeight] = useState("");

  const canCommit = chars.trim() !== "" && annos.trim() !== "";

  const reset = () => {
    setChars("");
    setAnnos("");
    setWeight("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {t("step2.add.button")}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t("step2.add.chars")}
            value={chars}
            onChange={(e) => setChars(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label={t("step2.add.annos")}
            value={annos}
            onChange={(e) => setAnnos(e.target.value)}
            fullWidth
          />
          <TextField
            label={t("step2.add.weight")}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            type="number"
            fullWidth
            // Subtle nudge so users know the column actually matters —
            // most readers see "Weight" and assume metadata, but it
            // drives the default-reading pick + variant truncation +
            // ccmp rule order downstream in csv_parser.py.
            helperText={t("step2.add.weightHint")}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!canCommit}
          onClick={() => {
            const w = weight.trim();
            onAdd({
              chars: chars.trim(),
              annos: annos.trim(),
              weight: w === "" ? undefined : Number(w),
            });
            reset();
            onClose();
          }}
        >
          {t("step2.add.commit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Step2Mappings;
