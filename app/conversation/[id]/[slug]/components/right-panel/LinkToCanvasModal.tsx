"use client";

import * as React from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  OutlinedInput,
  Paper,
  Typography,
} from "@mui/material";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import Clear from "@mui/icons-material/Clear";
import Close from "@mui/icons-material/Close";
import EditNote from "@mui/icons-material/EditNote";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Search from "@mui/icons-material/Search";
import Star from "@mui/icons-material/Star";
import StarBorder from "@mui/icons-material/StarBorder";
import ViewList from "@mui/icons-material/ViewList";
import ViewModule from "@mui/icons-material/ViewModule";
import { addCanvasLinks, getWorkspaceCanvases } from "./pageApi";

const PRIMARY = "#1C1C92";

const checkboxSx = {
  color: PRIMARY,
  "&.Mui-checked": { color: PRIMARY },
};

const outlinedControlSx = {
  borderColor: PRIMARY,
  color: PRIMARY,
  "&:hover": {
    borderColor: PRIMARY,
    backgroundColor: "rgba(28, 28, 146, 0.06)",
  },
};

/** dd/mm/yyyy */
function formatCreatedAtDdMmYyyy(iso?: string): string {
  if (!iso) return "dd/mm/yyyy";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "dd/mm/yyyy";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatFileSize(canvas: WorkspaceCanvasLike): string {
  const n =
    canvas.sizeBytes ?? canvas.fileSize ?? canvas.size ?? canvas.bytes ?? null;
  if (typeof n === "number" && n >= 0) {
    const mb = n / (1024 * 1024);
    if (mb >= 1) return `${Math.round(mb)} MB`;
    if (mb > 0) return `${Math.round(mb * 10) / 10} MB`;
  }
  return "20 MB";
}

interface WorkspaceCanvasLike {
  _id?: string;
  id?: string;
  name?: string;
  createdAt?: string;
  starred?: boolean;
  isStarred?: boolean;
  sizeBytes?: number;
  fileSize?: number;
  size?: number;
  bytes?: number;
}

export interface LinkToCanvasModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  conversationId: string;
  pageId: string;
  pageName: string;
  existingCanvasLinks: string[];
  /** Called after PATCH succeeds — e.g. refetch pages */
  onSuccess?: () => void | Promise<void>;
}

type ViewMode = "list" | "grid";
type SortKey = "name" | "createdAt" | "size";
type SortDir = "asc" | "desc";

function normalizeCanvas(raw: WorkspaceCanvasLike) {
  const id = String(raw._id ?? raw.id ?? "");
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "",
    createdAt: raw.createdAt,
    starred: Boolean(raw.starred ?? raw.isStarred),
    raw,
  };
}

export default function LinkToCanvasModal({
  open,
  onClose,
  workspaceId,
  conversationId,
  pageId,
  pageName,
  existingCanvasLinks,
  onSuccess,
}: LinkToCanvasModalProps) {
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>(() =>
    existingCanvasLinks.map(String),
  );
  const [canvases, setCanvases] = React.useState<WorkspaceCanvasLike[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [sortAnchor, setSortAnchor] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelected(existingCanvasLinks.map(String));
  }, [open, existingCanvasLinks]);

  React.useEffect(() => {
    if (!open || !workspaceId) return;
    let cancelled = false;
    setLoading(true);
    void getWorkspaceCanvases({ workspaceId }).then((list) => {
      if (!cancelled) {
        setCanvases(Array.isArray(list) ? list : []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  const normalizedRows = React.useMemo(
    () =>
      canvases
        .map((c) => normalizeCanvas(c))
        .filter((row) => row.id.length > 0),
    [canvases],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalizedRows;
    return normalizedRows.filter((row) =>
      row.name.toLowerCase().includes(q),
    );
  }, [normalizedRows, search]);

  const sortedRows = React.useMemo(() => {
    const mul = sortDir === "asc" ? 1 : -1;
    const out = [...filtered];
    out.sort((a, b) => {
      if (sortKey === "name") {
        return mul * a.name.localeCompare(b.name);
      }
      if (sortKey === "createdAt") {
        const ta = new Date(a.createdAt ?? "").getTime();
        const tb = new Date(b.createdAt ?? "").getTime();
        const ea = Number.isNaN(ta) ? 0 : ta;
        const eb = Number.isNaN(tb) ? 0 : tb;
        return mul * (ea - eb);
      }
      /* size — placeholder compares formatted string MB */
      return (
        mul *
        formatFileSize(a.raw).localeCompare(formatFileSize(b.raw))
      );
    });
    return out;
  }, [filtered, sortKey, sortDir]);

  const toggleSelect = (id: string) => {
    const sid = String(id);
    setSelected((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  };

  const orderedSelectedCanvasNames = React.useMemo(() => {
    const map = new Map(normalizedRows.map((r) => [r.id, r.name]));
    return sortedRows
      .filter((r) => selected.includes(r.id))
      .map((r) => ({
        id: r.id,
        name: map.get(r.id) || r.name,
      }));
  }, [normalizedRows, sortedRows, selected]);

  const firstLinked = orderedSelectedCanvasNames[0];
  const moreCount =
    orderedSelectedCanvasNames.length > 0
      ? orderedSelectedCanvasNames.length - 1
      : 0;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const ok = await addCanvasLinks({
        workspaceId,
        conversationId,
        pageId,
        canvasIds: selected,
      });
      if (ok) {
        await onSuccess?.();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = (
    _: unknown,
    reason: "backdropClick" | "escapeKeyDown",
  ) => {
    if (submitting) return;
    if (reason === "backdropClick" || reason === "escapeKeyDown") onClose();
  };

  const setSortFromMenu = (key: SortKey, dir: SortDir) => {
    setSortKey(key);
    setSortDir(dir);
    setSortAnchor(null);
  };

  const arrow = sortDir === "asc" ? "↑" : "↓";

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "12px",
            bgcolor: "#fff",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              Link to
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#6b7280", mt: 0.5 }}
            >
              Select sources that you would like to move
            </Typography>
          </Box>
          <IconButton
            aria-label="Close"
            onClick={() => {
              if (!submitting) onClose();
            }}
            size="small"
            sx={{ color: PRIMARY }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, px: 3, pb: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <OutlinedInput
            fullWidth
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{
              borderRadius: "999px",
              bgcolor: "#F5F5F5",
              pr: 0.5,
              "& .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
            }}
            inputProps={{
              "aria-label": "Search canvases",
            }}
            startAdornment={
              <InputAdornment position="start" sx={{ pl: 1 }}>
                <Search sx={{ fontSize: 20, color: PRIMARY }} />
              </InputAdornment>
            }
            endAdornment={
              search ? (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Clear search"
                    size="small"
                    onClick={() => setSearch("")}
                    sx={{ color: PRIMARY }}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined
            }
          />

          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: "auto",
            }}
          >
            <IconButton
              size="small"
              aria-label="List view"
              onClick={() => setViewMode("list")}
              sx={{
                ...outlinedControlSx,
                borderRadius: "8px",
                border: "1px solid",
                borderColor: PRIMARY,
                bgcolor:
                  viewMode === "list"
                    ? "rgba(28, 28, 146, 0.08)"
                    : "transparent",
              }}
            >
              <ViewList fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
              sx={{
                ...outlinedControlSx,
                borderRadius: "8px",
                border: "1px solid",
                borderColor: PRIMARY,
                bgcolor:
                  viewMode === "grid"
                    ? "rgba(28, 28, 146, 0.08)"
                    : "transparent",
              }}
            >
              <ViewModule fontSize="small" />
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              endIcon={<ExpandMore sx={{ color: PRIMARY }} />}
              aria-controls={sortAnchor ? "link-to-sort-menu" : undefined}
              aria-haspopup="true"
              onClick={(e) => setSortAnchor(e.currentTarget)}
              sx={{
                textTransform: "none",
                color: PRIMARY,
                borderColor: PRIMARY,
                borderRadius: "8px",
              }}
            >
              Sort
            </Button>
            <Menu
              id="link-to-sort-menu"
              anchorEl={sortAnchor}
              open={Boolean(sortAnchor)}
              onClose={() => setSortAnchor(null)}
            >
              <MenuItem onClick={() => setSortFromMenu("name", "asc")}>
                Name (A–Z)
              </MenuItem>
              <MenuItem onClick={() => setSortFromMenu("name", "desc")}>
                Name (Z–A)
              </MenuItem>
              <MenuItem onClick={() => setSortFromMenu("createdAt", "desc")}>
                Newest first
              </MenuItem>
              <MenuItem onClick={() => setSortFromMenu("createdAt", "asc")}>
                Oldest first
              </MenuItem>
              <MenuItem onClick={() => setSortFromMenu("size", "desc")}>
                File size (largest first)
              </MenuItem>
              <MenuItem onClick={() => setSortFromMenu("size", "asc")}>
                File size (smallest first)
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Column headers */}
        <Box
          sx={{
            display:
              viewMode === "grid" ? "none" : "grid",
            gridTemplateColumns:
              "40px minmax(0, 1fr) 140px 100px 40px",
            alignItems: "center",
            mb: 1,
            px: 0,
            columnGap: 1,
          }}
        >
          <Box />
          <Typography variant="body2" sx={{ fontWeight: 600, color: "grey.700" }}>
            Name {sortKey === "name" ? arrow : "↓"}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "grey.700", textAlign: "center" }}>
            Creation date {sortKey === "createdAt" ? arrow : "↓"}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "grey.700", textAlign: "center" }}>
            File size {sortKey === "size" ? arrow : "↓"}
          </Typography>
          <Box />
        </Box>

        {loading ? (
          <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
            Loading canvases…
          </Typography>
        ) : viewMode === "list" ? (
          <Box sx={{ maxHeight: 360, overflowY: "auto", pr: 0.25 }}>
            {sortedRows.map((row) => {
              const checked = selected.includes(row.id);
              const star = Boolean(row.starred);
              return (
                <Paper
                  key={row.id}
                  elevation={0}
                  sx={{
                    mb: 1,
                    px: 2,
                    py: 1.5,
                    borderRadius: "8px",
                    bgcolor: checked ? "#EFEEFC" : "#F5F5F5",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "40px minmax(0, 1fr) 140px 100px 40px",
                      alignItems: "center",
                      columnGap: 1,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={() => toggleSelect(row.id)}
                      sx={checkboxSx}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <EditNote sx={{ color: PRIMARY, fontSize: 22, flexShrink: 0 }} />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700 }}
                        noWrap
                        title={row.name}
                      >
                        {row.name || "Canvas"}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: "grey.900", textAlign: "center" }}>
                      {formatCreatedAtDdMmYyyy(row.createdAt)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "grey.900", textAlign: "center" }}>
                      {formatFileSize(row.raw)}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      {star ? (
                        <Star sx={{ color: "#FFC107", fontSize: 22 }} />
                      ) : (
                        <StarBorder sx={{ color: "#bdbdbd", fontSize: 22 }} />
                      )}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.5,
              maxHeight: 360,
              overflowY: "auto",
              py: 0.25,
            }}
          >
            {sortedRows.map((row) => {
              const checked = selected.includes(row.id);
              const star = Boolean(row.starred);
              return (
                <Paper
                  key={row.id}
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: "8px",
                    bgcolor: checked ? "#EFEEFC" : "#F5F5F5",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={() => toggleSelect(row.id)}
                      sx={checkboxSx}
                    />
                    {star ? (
                      <Star sx={{ color: "#FFC107", fontSize: 22 }} />
                    ) : (
                      <StarBorder sx={{ color: "#bdbdbd", fontSize: 22 }} />
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                      minWidth: 0,
                    }}
                  >
                    <EditNote sx={{ color: PRIMARY, fontSize: 22, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={row.name}>
                      {row.name || "Canvas"}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "grey.700", display: "block", textAlign: "center" }}>
                    {formatCreatedAtDdMmYyyy(row.createdAt)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "grey.700", display: "block", textAlign: "center" }}>
                    {formatFileSize(row.raw)}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <Box
        sx={{
          borderTop: "1px solid #E0E0E0",
          px: 3,
          py: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", minWidth: 0 }}>
          <ArticleOutlined sx={{ fontSize: 22, color: "#616161" }} />
          <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
            {pageName}
          </Typography>
          <Typography variant="body2" component="span" sx={{ fontStyle: "italic", color: "#6b7280" }}>
            linked to
          </Typography>
          {firstLinked ? (
            <>
              <EditNote sx={{ fontSize: 22, color: PRIMARY }} />
              <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                {firstLinked.name}
              </Typography>
              {moreCount > 0 ? (
                <Typography
                  variant="body2"
                  component="span"
                  sx={{ fontWeight: 500, color: "#1976D2" }}
                >
                  +{moreCount} more
                </Typography>
              ) : null}
            </>
          ) : (
            <Typography variant="body2" component="span" sx={{ color: "grey.600" }}>
              No canvases selected
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={() => void handleConfirm()}
          sx={{
            bgcolor: PRIMARY,
            color: "#fff",
            borderRadius: "8px",
            px: 3,
            textTransform: "none",
            boxShadow: "none",
            "&:hover": { bgcolor: PRIMARY, opacity: 0.92 },
          }}
        >
          Confirm
        </Button>
      </Box>
    </Dialog>
  );
}
