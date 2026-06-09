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
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { ChangeEvent, useCallback, useDeferredValue, useMemo, useState } from "react";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
import { MappingRow } from "../types";
import { VirtualList } from "../VirtualList";

const ROW_HEIGHT = 56;

const Step2Mappings = () => {
  const { t } = useTranslation();
  const {
    mappings,
    updateMapping,
    deleteMapping,
    clearMappings,
    addMapping,
    loadMappingsFromCsvText,
    loadDefaultMappings,
    exportMappingsAsCsv,
  } = useGenerate();

  const [search, setSearch] = useState("");
  // useDeferredValue debounces the filter for free without us picking a
  // debounce-window number. The user sees their typed character
  // immediately, the list updates on the next frame.
  const deferredSearch = useDeferredValue(search);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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

  const handleLoadDefault = useCallback(async () => {
    try {
      await loadDefaultMappings();
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }, [loadDefaultMappings]);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box>
        <Typography variant="h6">{t("step2.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("step2.description")}
        </Typography>
      </Box>

      {importError && <Alert severity="error">{importError}</Alert>}

      {/* Toolbar: import / default / export / clear + count */}
      <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
        <Button variant="outlined" component="label" size="small">
          {t("step2.import.button")}
          <input hidden type="file" accept=".csv,text/csv" onChange={handleImport} />
        </Button>
        <Button variant="text" size="small" onClick={handleLoadDefault}>
          {t("step2.import.useDefault")}
        </Button>
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
        >
          {t("step2.add.button")}
        </Button>
      </Stack>

      {/* Header row (above the virtualised list) */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
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

        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            {mappings.length === 0
              ? t("step2.empty")
              : `No matches for "${search}"`}
          </Box>
        ) : (
          <VirtualList<MappingRow>
            items={filtered}
            itemHeight={ROW_HEIGHT}
            height={420}
            renderRow={(row) => (
              <Row
                row={row}
                isEditing={editingId === row.id}
                onStartEdit={() => setEditingId(row.id)}
                onStopEdit={() => setEditingId(null)}
                onChange={(patch) => updateMapping(row.id, patch)}
                onDelete={() => setPendingDelete(row.id)}
              />
            )}
          />
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
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (patch: Partial<Omit<MappingRow, "id">>) => void;
  onDelete: () => void;
}

const Row = ({ row, isEditing, onStartEdit, onStopEdit, onChange, onDelete }: RowProps) => {
  return (
    <Box
      display="grid"
      gridTemplateColumns="2fr 3fr 1fr 96px"
      alignItems="center"
      sx={{
        px: 1.5,
        height: ROW_HEIGHT,
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
