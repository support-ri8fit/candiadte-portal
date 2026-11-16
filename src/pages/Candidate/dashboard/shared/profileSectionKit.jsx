// src/pages/Candidate/dashboard/shared/profileSectionKit.jsx
//
// Small shared pieces for the References, Career Profile and Emergency Contact
// blocks, so they look exactly like Education / Certifications / Personal Details.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, useMediaQuery, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import candidateApi from "../../../../services/candidateApi";
import { palette, fonts } from "../../../../theme/candidateTokens";

/* ── API helpers ─────────────────────────────────────────────────────────── */

/* HTTP 200 can still carry { success:false, status:404 } — treat that as "nothing saved" */
export const isFailureBody = (body) =>
  !!body && (body.success === false || (body.status && Number(body.status) >= 400));

export const unwrapData = (res) => {
  const body = res?.data;
  if (isFailureBody(body)) return null;
  return body?.data ?? body ?? null;
};

export const apiErrorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "") ||
  err?.message ||
  fallback;

/* Turns any dropdown item into { key, label } */
export const toOption = (item) => {
  if (typeof item === "string") return { key: item, label: item };
  const key = item?.key ?? item?.value ?? item?.code ?? item?.label ?? item?.name ?? "";
  const label = item?.label ?? item?.lable ?? item?.name ?? item?.display_name ?? item?.value ?? key;
  return { key: String(key), label: String(label) };
};

/* Finds the options array whether the API returns [..], { data: [..] }, { data: { items: [..] } } … */
export const extractOptions = (res) => {
  const list =
    [res, res?.data, res?.data?.data, res?.data?.items, res?.data?.data?.items, res?.items].find(Array.isArray) || [];
  const seen = new Set();
  return list.map(toOption).filter((o) => o.key && !seen.has(o.key) && seen.add(o.key));
};

/* Saved value → label to show (falls back to the value itself) */
export const labelForKey = (options = [], value) =>
  options.find((o) => o.key === value)?.label ?? value ?? "";

/* Label picked / typed in the field → value to save (typed text is kept as is) */
export const keyForLabel = (options = [], label) =>
  options.find((o) => o.label === label)?.key ?? options.find((o) => o.key === label)?.key ?? label;

/* Loads a dropdown's options once (the first time `enabled` is true).
   Returns `labels` for the field and `options` ({ key, label }) to map saved keys. */
export const useDropdownLabels = (url, { enabled = true, fallback = [] } = {}) => {
  const [options, setOptions] = useState(fallback.map(toOption));
  const [loading, setLoading] = useState(false);
  const loadedFor = useRef(null);

  useEffect(() => {
    if (!enabled || !url || loadedFor.current === url) return undefined;
    let active = true;
    loadedFor.current = url;
    setLoading(true);
    candidateApi
      .get(url)
      .then((res) => {
        const list = extractOptions(res);
        if (active && list.length) setOptions(list);
      })
      .catch((err) => {
        loadedFor.current = null; // allow a retry next time
        console.warn(`Dropdown API failed: ${url}`, err);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [url, enabled]);

  return { options, labels: options.map((o) => o.label), loading };
};

/* ── Validation helpers ─────────────────────────────────────────────────── */
export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
// Allows +, spaces, dashes and brackets; needs 7–15 digits
export const isValidPhone = (v) => {
  const digits = String(v).replace(/\D/g, "");
  return /^[+\d\s\-()]+$/.test(String(v).trim()) && digits.length >= 7 && digits.length <= 15;
};
export const clean = (v) => (v === null || v === undefined ? "" : String(v).trim());
export const orNull = (v) => (clean(v) ? clean(v) : null);

/* ── Look ───────────────────────────────────────────────────────────────── */
export const dialogFieldSx = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: palette.line },
    "&:hover fieldset": { borderColor: palette.teal },
    "&.Mui-focused fieldset": { borderColor: palette.teal },
  },
  // 16px on touch screens stops iOS zooming into the field
  "@media (pointer: coarse)": { "& input, & textarea": { fontSize: 16 } },
};

export const primaryBtnSx = {
  bgcolor: palette.teal,
  textTransform: "none",
  fontWeight: 600,
  "&:hover": { bgcolor: palette.tealDeep },
};

/* Section card with the same header as the other profile sections */
export function SectionCard({ icon: Icon, title, action, children }) {
  return (
    <Box
      sx={{
        bgcolor: palette.paper,
        border: `1px solid ${palette.line}`,
        borderRadius: "14px",
        p: { xs: 2.5, sm: 3 },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: palette.tealSoft,
              color: palette.teal,
            }}
          >
            <Icon sx={{ fontSize: 18 }} />
          </Box>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 17, color: palette.ink }}>
            {title}
          </Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

/* Label / value row — same as Personal Details */
export const DetailRow = ({ icon, label, value }) => (
  <Box sx={{ display: "flex", alignItems: "flex-start", gap: { xs: 0.8, sm: 1.25 }, mt: 1.25, minWidth: 0 }}>
    <Box sx={{ color: palette.teal, display: "flex", flexShrink: 0, mt: "2px" }}>{icon}</Box>
    <Typography
      sx={{
        fontSize: { xs: 11.5, sm: 12 },
        color: palette.muted,
        width: { xs: 100, sm: 150 },
        flexShrink: 0,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: { xs: 12.5, sm: 13.5 },
        color: palette.ink,
        flex: 1,
        minWidth: 0,
        overflowWrap: "anywhere",
      }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

/* Add / edit dialog — full screen on phones, buttons stacked there */
export function FormDialog({ open, title, onClose, onSave, saving, saveLabel = "Save", error, children }) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isPhone}
      PaperProps={{ sx: { borderRadius: isPhone ? 0 : "14px" } }}
    >
      <DialogTitle sx={{ fontFamily: fonts.display, fontWeight: 600, color: palette.ink, pr: 6 }}>
        {title}
        <IconButton
          onClick={handleClose}
          disabled={saving}
          aria-label="Close"
          sx={{ position: "absolute", right: 8, top: 8, color: palette.teal }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Typography sx={{ color: palette.coral, fontSize: 13.5, mb: 2 }}>{error}</Typography>
        )}
        {children}
      </DialogContent>
      <DialogActions
        sx={{
          p: 2,
          gap: 1,
          flexDirection: { xs: "column-reverse", sm: "row" },
          "& > :not(style) ~ :not(style)": { ml: { xs: 0, sm: 1 } },
          "& .MuiButton-root": { width: { xs: "100%", sm: "auto" }, minHeight: 40 },
        }}
      >
        <Button
          onClick={handleClose}
          disabled={saving}
          variant="outlined"
          sx={{ borderColor: palette.line, color: palette.ink, textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving} sx={primaryBtnSx}>
          {saving ? "Saving..." : saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}