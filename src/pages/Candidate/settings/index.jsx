// src/pages/Candidate/settings/index.jsx
//
// Candidate Settings — /for-candidate/settings
// Layout: grouped settings card with rows. "Password" row opens a
// Change-password dialog (POST /auth/candidate/change_password).
//
// Password rule (same as Hiring): 8+ chars, upper case, lower case, number, special char.
//
// Responsive:
//   xs  (< 600px)  phones          — rows stack, full-width buttons, full-screen dialog
//   sm  (600–899)  tablets / iPad portrait
//   md+ (≥ 900)    iPad landscape, laptops, Mac, desktop — 820px column, left aligned
// Touch devices get 16px inputs (stops iOS Safari zooming on focus) and 44px tap targets.
import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSelector } from "react-redux";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { toast } from "react-toastify";
import candidateApi from "../../../services/candidateApi";
import { getItem } from "../../../utils/helper";
import { downloadProfilePdf } from "../../../utils/downloadProfilePdf";
import { palette } from "../../../theme/candidateTokens";

/* ── Password rule ─────────────────────────────────────────────────────── */
const PASSWORD_RULES = [
  { key: "length", label: "8+ characters", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "Uppercase", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "Lowercase", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "Number", test: (pw) => /\d/.test(pw) },
  { key: "special", label: "Special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const EMPTY_FORM = { old_password: "", new_password: "", confirm_password: "" };

/* ── Help & legal — TODO: replace with the real links / email before release ──
   A row is hidden automatically when its value is left empty. */
const HELP_LINKS = {
  privacyUrl: "/privacy-policy", // Privacy policy page (relative path or full https:// URL)
  termsUrl: "/terms", // Terms of service page
  supportEmail: "support@ri8fit.com", // Contact support — opens the mail app
};

const safeParse = (raw) => {
  try {
    return raw && raw !== "undefined" ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/* Pull a readable message out of a FastAPI error */
const apiErrorMessage = (error) => {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  return data?.message || "Couldn't change your password. Please try again.";
};

/* ── Device helpers ────────────────────────────────────────────────────── */
// Phones and tablets (finger input) — bigger tap targets, 16px text in inputs
const TOUCH = "@media (pointer: coarse)";
// Only devices with a real mouse get hover effects (no "stuck" hover on iPad)
const HOVER = "@media (hover: hover)";

/* ── Shared styles ─────────────────────────────────────────────────────── */
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    background: "#fff",
    fontSize: 14,
    "& fieldset": { borderColor: palette.line },
    [HOVER]: { "&:hover fieldset": { borderColor: palette.teal } },
    "&.Mui-focused fieldset": { borderColor: palette.teal, borderWidth: "1.5px" },
    [TOUCH]: { fontSize: 16 },
  },
  "& .MuiOutlinedInput-input": { py: 1.1, [TOUCH]: { py: 1.4 } },
  "& .MuiFormHelperText-root": { fontSize: 12, ml: 0, mt: 0.5 },
};

const primaryBtnSx = {
  textTransform: "none",
  fontWeight: 700,
  borderRadius: "10px",
  px: 2.5,
  minHeight: 40,
  bgcolor: palette.teal,
  boxShadow: "none",
  // After a tap, phones keep the button in :hover — keep it teal there too
  "&:hover": { bgcolor: palette.teal, boxShadow: "none" },
  [HOVER]: { "&:hover": { bgcolor: palette.tealDeep } },
  [TOUCH]: { minHeight: 44 },
};

const textBtnSx = {
  textTransform: "none",
  fontWeight: 600,
  color: palette.muted,
  borderRadius: "10px",
  minHeight: 40,
  [TOUCH]: { minHeight: 44 },
};

/* Colour tones — each row / section gets its own accent so the page isn't flat */
const TONES = {
  teal: { main: palette.teal, soft: palette.tealSoft },
  amber: { main: "#B5770F", soft: "#FCF1DC" },
  blue: { main: "#2F6FB3", soft: "#E7F0FB" },
  coral: { main: "#CF4F3B", soft: "#FCE9E5" },
  violet: { main: "#6A57B8", soft: "#EFEBFA" },
};

const filledBtnSx = (tone = TONES.teal) => ({
  textTransform: "none",
  fontWeight: 600,
  fontSize: 13.5,
  borderRadius: "10px",
  px: 2.25,
  minHeight: 38,
  whiteSpace: "nowrap",
  boxShadow: "none",
  bgcolor: tone.main,
  color: "#fff",
  "&:hover": { bgcolor: tone.main, boxShadow: "none" },
  [HOVER]: { "&:hover": { bgcolor: tone.main, filter: "brightness(0.92)", boxShadow: "none" } },
  "&.Mui-disabled": { bgcolor: tone.soft, color: tone.main },
  [TOUCH]: { minHeight: 44 },
});


/* ── Password field with show / hide ───────────────────────────────────── */
function PasswordField({ id, label, value, onChange, error, autoComplete, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <Box>
      <Typography
        component="label"
        htmlFor={id}
        sx={{ display: "block", fontSize: 13, fontWeight: 600, color: palette.ink, mb: 0.75 }}
      >
        {label}
      </Typography>
      <TextField
        id={id}
        name={id}
        fullWidth
        size="small"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        error={!!error}
        helperText={error}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        sx={fieldSx}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                sx={{ color: palette.muted, [TOUCH]: { p: 1.1 } }}
              >
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
}

/* Compact rule pills under "New password" — turn green as each rule is met */
function RulePills({ password }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <Box
            key={rule.key}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.35,
              borderRadius: "999px",
              fontSize: 11.5,
              fontWeight: 600,
              color: ok ? "#15803D" : palette.muted,
              bgcolor: ok ? "#E7F7EC" : "#F3F5F4",
              transition: "background-color .2s ease, color .2s ease",
            }}
          >
            {ok && <CheckRoundedIcon sx={{ fontSize: 13 }} />}
            {rule.label}
          </Box>
        );
      })}
    </Box>
  );
}

/* ── Change password dialog ────────────────────────────────────────────── */
function ChangePasswordDialog({ open, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const meetsRule = useMemo(
    () => PASSWORD_RULES.every((r) => r.test(form.new_password)),
    [form.new_password]
  );

  const reset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.old_password) next.old_password = "Current password is required";
    if (!form.new_password) next.new_password = "New password is required";
    else if (!meetsRule) next.new_password = "Password does not meet all requirements";
    else if (form.new_password === form.old_password)
      next.new_password = "New password must be different from your current password";
    if (!form.confirm_password) next.confirm_password = "Confirm your new password";
    else if (form.confirm_password !== form.new_password)
      next.confirm_password = "Passwords do not match";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      // The API takes the three values as query parameters (see Swagger)
      const { data } = await candidateApi.post("/auth/candidate/change_password", null, {
        params: {
          old_password: form.old_password,
          new_password: form.new_password,
          confirm_password: form.confirm_password,
        },
      });

      if (data?.success === false) {
        toast.error(data?.message || "Couldn't change your password. Please try again.");
        return;
      }
      toast.success(data?.message || "Password changed successfully");
      onClose();
    } catch (error) {
      const message = apiErrorMessage(error);
      // Wrong current password → show it on that field
      if (/old|current|incorrect|wrong/i.test(message)) {
        setErrors((prev) => ({ ...prev, old_password: message }));
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="xs"
      TransitionProps={{ onExited: reset }}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : "16px",
          // keep clear of the iPhone notch / home bar
          pt: fullScreen ? "env(safe-area-inset-top)" : 0,
        },
      }}
    >
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", height: fullScreen ? "100%" : "auto" }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            px: { xs: 2.5, sm: 3 },
            pt: { xs: 2.5, sm: 3 },
            pb: 1,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              bgcolor: palette.tealSoft,
              color: palette.teal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <LockOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: palette.ink, lineHeight: 1.3 }}>
              Change password
            </Typography>
            <Typography sx={{ fontSize: 13, color: palette.muted, mt: 0.25 }}>
              Use a strong password you don't use elsewhere.
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            aria-label="Close"
            sx={{ color: palette.muted, mt: -0.5, [TOUCH]: { p: 1.1, mt: -1 } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Fields */}
        <DialogContent
          sx={{
            px: { xs: 2.5, sm: 3 },
            pt: 2,
            pb: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2.25,
            flex: fullScreen ? 1 : "initial",
          }}
        >
          <PasswordField
            id="old_password"
            label="Current password"
            value={form.old_password}
            onChange={handleChange}
            error={errors.old_password}
            autoComplete="current-password"
            autoFocus
          />
          <Box>
            <PasswordField
              id="new_password"
              label="New password"
              value={form.new_password}
              onChange={handleChange}
              error={errors.new_password}
              autoComplete="new-password"
            />
            <RulePills password={form.new_password} />
          </Box>
          <PasswordField
            id="confirm_password"
            label="Confirm new password"
            value={form.confirm_password}
            onChange={handleChange}
            error={errors.confirm_password}
            autoComplete="new-password"
          />
        </DialogContent>

        {/* Actions — phones: full-width, primary on top, pinned to the bottom */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column-reverse", sm: "row" },
            justifyContent: "flex-end",
            gap: 1,
            px: { xs: 2.5, sm: 3 },
            pt: 2,
            pb: { xs: "calc(16px + env(safe-area-inset-bottom))", sm: 3 },
            borderTop: { xs: `1px solid ${palette.line}`, sm: "none" },
            bgcolor: palette.paper,
            position: { xs: "sticky", sm: "static" },
            bottom: 0,
          }}
        >
          <Button
            type="button"
            onClick={handleClose}
            disabled={saving}
            fullWidth={fullScreen}
            sx={textBtnSx}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            fullWidth={fullScreen}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={primaryBtnSx}
          >
            {saving ? "Updating…" : "Update password"}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

/* ── One settings row: icon · title + description · action ─────────────── */
function SettingRow({ icon, title, description, action, last = false, tone = TONES.teal }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "stretch", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 1.75, sm: 2 },
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.25 },
        borderBottom: last ? "none" : `1px solid ${palette.line}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 1.75 }, flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: { xs: 36, sm: 38 },
            height: { xs: 36, sm: 38 },
            borderRadius: "11px",
            bgcolor: tone.soft,
            color: tone.main,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 14, sm: 14.5 }, fontWeight: 600, color: palette.ink }}>
            {title}
          </Typography>
          <Typography
            title={typeof description === "string" ? description : undefined}
            sx={{
              fontSize: 13,
              color: palette.muted,
              mt: 0.25,
              // phones: wrap long emails; wider screens: one line with "…"
              overflowWrap: "anywhere",
              whiteSpace: { xs: "normal", sm: "nowrap" },
              overflow: { sm: "hidden" },
              textOverflow: { sm: "ellipsis" },
            }}
          >
            {description}
          </Typography>
        </Box>
      </Box>
      {/* phones: full-width button under the text; tablets+: on the right */}
      {action && <Box sx={{ flexShrink: 0, "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } } }}>{action}</Box>}
    </Box>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
/* ── Clickable settings row (whole row is the link) ───────────────────── */
function LinkRow({ icon, title, description, href, external = false, last = false, tone = TONES.teal }) {
  return (
    <Box
      component="a"
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1.5, sm: 1.75 },
        px: { xs: 2, sm: 3 },
        py: { xs: 1.75, sm: 2 },
        minHeight: 56,
        textDecoration: "none",
        color: "inherit",
        borderBottom: last ? "none" : `1px solid ${palette.line}`,
        transition: "background-color .15s ease",
        "&:active": { bgcolor: palette.tealSoft },
        [HOVER]: { "&:hover": { bgcolor: "#F7FAF9", "& .row-arrow": { color: tone.main, transform: "translateX(2px)" } } },
        "&:focus-visible": { outline: `2px solid ${palette.teal}`, outlineOffset: -2 },
      }}
    >
      <Box
        sx={{
          width: { xs: 36, sm: 38 },
          height: { xs: 36, sm: 38 },
          borderRadius: "11px",
          bgcolor: tone.soft,
          color: tone.main,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: { xs: 14, sm: 14.5 }, fontWeight: 600, color: palette.ink }}>
          {title}
        </Typography>
        {description && (
          <Typography
            sx={{
              fontSize: 13,
              color: palette.muted,
              mt: 0.25,
              // phones: wrap; wider screens: one line with "…"
              overflowWrap: "anywhere",
              whiteSpace: { xs: "normal", sm: "nowrap" },
              overflow: { sm: "hidden" },
              textOverflow: { sm: "ellipsis" },
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
      {external ? (
        <OpenInNewRoundedIcon className="row-arrow" sx={{ fontSize: 18, color: palette.muted, flexShrink: 0, transition: "all .15s ease" }} />
      ) : (
        <ChevronRightRoundedIcon className="row-arrow" sx={{ fontSize: 22, color: palette.muted, flexShrink: 0, transition: "all .15s ease" }} />
      )}
    </Box>
  );
}

/* Section label above a card, e.g. "ACCOUNT & SECURITY" */
function SectionLabel({ icon: Icon, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
      <Icon sx={{ fontSize: 18, color: palette.teal }} />
      <Typography
        sx={{ fontSize: 12, fontWeight: 700, color: palette.muted, letterSpacing: 0.6, textTransform: "uppercase" }}
      >
        {children}
      </Typography>
    </Box>
  );
}

const cardSx = {
  bgcolor: palette.paper,
  border: `1px solid ${palette.line}`,
  borderRadius: "14px",
  overflow: "hidden",
};

/* ── Left menu item (desktop) ─────────────────────────────────────────── */
function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      sx={{
        all: "unset",
        boxSizing: "border-box",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.25,
        py: 1,
        borderRadius: "10px",
        cursor: "pointer",
        bgcolor: active ? palette.tealSoft : "transparent",
        transition: "background-color .15s ease",
        [HOVER]: { "&:hover": { bgcolor: active ? palette.tealSoft : "#F1F5F4" } },
        "&:focus-visible": { outline: `2px solid ${palette.teal}`, outlineOffset: 2 },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          bgcolor: active ? palette.paper : item.tone.soft,
          color: item.tone.main,
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{ fontSize: 13.5, fontWeight: active ? 700 : 600, color: active ? palette.teal : palette.ink, lineHeight: 1.3 }}
        >
          {item.label}
        </Typography>
        <Typography sx={{ fontSize: 12, color: palette.muted, lineHeight: 1.35, mt: 0.25 }}>{item.hint}</Typography>
      </Box>
    </Box>
  );
}

/* ── Pill tabs (phones / small tablets) ───────────────────────────────── */
function NavPills({ items, value, onChange }) {
  return (
    <Box
      role="tablist"
      sx={{
        display: "flex",
        gap: 1,
        overflowX: "auto",
        mx: { xs: -2, sm: -3 },
        px: { xs: 2, sm: 3 },
        pb: 0.5,
        mb: 2.5,
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        return (
          <Box
            key={item.key}
            component="button"
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            sx={{
              all: "unset",
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              flex: { xs: 1, sm: "0 0 auto" },
              flexShrink: 0,
              minHeight: 40,
              px: { xs: 1, sm: 1.75 },
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              border: `1px solid ${active ? item.tone.main : palette.line}`,
              bgcolor: active ? item.tone.main : palette.paper,
              color: active ? "#fff" : palette.ink,
              transition: "all .15s ease",
              [TOUCH]: { minHeight: 44 },
              "&:focus-visible": { outline: `2px solid ${palette.teal}`, outlineOffset: 2 },
            }}
          >
            <Icon
              sx={{
                fontSize: 18,
                color: active ? "#fff" : item.tone.main,
                display: { xs: "none", sm: "inline-block" },
              }}
            />
            {item.label}
          </Box>
        );
      })}
    </Box>
  );
}

/* ── Right-panel heading for the selected section ─────────────────────── */
function PanelHeader({ section }) {
  const Icon = section.icon;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.25 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          bgcolor: section.tone.soft,
          color: section.tone.main,
        }}
      >
        <Icon sx={{ fontSize: 19 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h2"
          sx={{ fontSize: 16, fontWeight: 700, color: palette.ink, lineHeight: 1.3 }}
        >
          {section.title}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: palette.muted, mt: 0.25 }}>{section.description}</Typography>
      </Box>
    </Box>
  );
}

const SECTIONS = [
  {
    key: "account",
    label: "Account",
    hint: "Email and password",
    icon: ShieldOutlinedIcon,
    tone: TONES.teal,
    title: "Account & security",
    description: "Your sign-in email and password.",
  },
  {
    key: "data",
    label: "Your data",
    hint: "Download your profile",
    icon: FolderOutlinedIcon,
    tone: TONES.amber,
    title: "Your data",
    description: "Take a copy of your Ri8fit profile with you.",
  },
  {
    key: "help",
    label: "Help & legal",
    hint: "Policies and support",
    icon: HelpOutlineRoundedIcon,
    tone: TONES.violet,
    title: "Help & legal",
    description: "Read our policies or get in touch with the team.",
  },
];

export default function CandidateSettings() {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("md"));

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [active, setActive] = useState(() => {
    const fromHash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    return SECTIONS.some((sec) => sec.key === fromHash) ? fromHash : "account";
  });

  // Keep the open section in the URL (#data, #help) so refresh / sharing keeps it
  const selectSection = (key) => {
    setActive(key);
    try {
      window.history.replaceState(null, "", `#${key}`);
    } catch {
      /* ignore */
    }
  };

  const handleDownloadProfile = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadProfilePdf();
      toast.success("Your profile PDF has been downloaded");
    } catch (err) {
      toast.error(err?.message || "Couldn't create your profile PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Email of the logged-in candidate (same sources the top bar uses)
  const loginUser = useSelector((state) => state?.candidate?.formData?.loginDetails?.user);
  const candidateDetails = useSelector((state) => state?.candidate?.formData?.candidateDetails);
  const storedUser = safeParse(getItem("candidate_user"));
  const email = candidateDetails?.email || loginUser?.email || storedUser?.email || "—";

  // Help & legal rows — any row without a link/email is left out
  const isExternal = (url) => /^https?:\/\//i.test(url || "");
  const helpRows = [
    HELP_LINKS.privacyUrl && {
      icon: <PolicyOutlinedIcon fontSize="small" />,
      title: "Privacy policy",
      description: "How we collect and use your data.",
      href: HELP_LINKS.privacyUrl,
      external: isExternal(HELP_LINKS.privacyUrl),
      tone: TONES.teal,
    },
    HELP_LINKS.termsUrl && {
      icon: <GavelRoundedIcon fontSize="small" />,
      title: "Terms of service",
      description: "The rules for using Ri8fit.",
      href: HELP_LINKS.termsUrl,
      external: isExternal(HELP_LINKS.termsUrl),
      tone: TONES.amber,
    },
    HELP_LINKS.supportEmail && {
      icon: <SupportAgentRoundedIcon fontSize="small" />,
      title: "Contact support",
      description: HELP_LINKS.supportEmail,
      tone: TONES.violet,
      href: `mailto:${HELP_LINKS.supportEmail}?subject=${encodeURIComponent("Help with my Ri8fit candidate account")}`,
    },
  ].filter(Boolean);

  const sections = SECTIONS.filter((sec) => sec.key !== "help" || helpRows.length > 0);
  const current = sections.find((sec) => sec.key === active) || sections[0];

  const panel = {
    account: (
      <Box sx={cardSx}>
        <SettingRow
          icon={<MailOutlineRoundedIcon fontSize="small" />}
          title="Email address"
          description={email}
          tone={TONES.blue}
        />
        <SettingRow
          icon={<LockOutlinedIcon fontSize="small" />}
          title="Password"
          description="Change the password you use to sign in."
          last
          tone={TONES.teal}
          action={
            <Button variant="contained" disableElevation onClick={() => setPasswordOpen(true)} sx={filledBtnSx(TONES.teal)}>
              Change password
            </Button>
          }
        />
      </Box>
    ),
    data: (
      <Box sx={cardSx}>
        <SettingRow
          icon={<PictureAsPdfOutlinedIcon fontSize="small" />}
          title="Download profile (PDF)"
          description="Your summary, skills, experience, education and certifications."
          last
          tone={TONES.coral}
          action={
            <Button
              variant="contained"
              disableElevation
              onClick={handleDownloadProfile}
              disabled={downloading}
              aria-busy={downloading}
              startIcon={
                downloading ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : <DownloadRoundedIcon />
              }
              sx={filledBtnSx(TONES.amber)}
            >
              {downloading ? "Preparing…" : "Download"}
            </Button>
          }
        />
      </Box>
    ),
    help: (
      <Box sx={cardSx}>
        {helpRows.map((row, i) => (
          <LinkRow key={row.title} {...row} last={i === helpRows.length - 1} />
        ))}
      </Box>
    ),
  };

  return (
    <Box
      sx={{
        background: "#F8FAF9",
        border: "1px solid #E1E5E7",
        borderRadius: "14px",
        p: { xs: 2.5, sm: 3 },
        boxSizing: "border-box",
      }}
    >
      {/* Page header — same style as Relevant Jobs / Skill Gap Analysis */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#EAF5F4",
            color: "#1E4F50",
            flexShrink: 0,
          }}
        >
          <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontWeight: 700,
              fontSize: 19,
              color: "#1F2937",
              lineHeight: 1.2,
            }}
          >
            Settings
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "#6B7280", mt: 0.25 }}>
            Manage your account, sign-in details and data.
          </Typography>
        </Box>
      </Box>

      {isWide ? (
        /* Desktop / iPad landscape: menu on the left, section on the right */
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "230px minmax(0, 1fr)",
            bgcolor: palette.paper,
            border: `1px solid ${palette.line}`,
            borderRadius: "14px",
            overflow: "hidden",
            minHeight: 340,
          }}
        >
          <Box
            component="nav"
            aria-label="Settings sections"
            sx={{
              p: 1.25,
              borderRight: `1px solid ${palette.line}`,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
            }}
          >
            {sections.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                active={item.key === current.key}
                onClick={() => selectSection(item.key)}
              />
            ))}
          </Box>

          <Box
            sx={{
              p: 3,
              minWidth: 0,
            }}
          >
            <PanelHeader section={current} />
            {panel[current.key]}
          </Box>
        </Box>
      ) : (
        /* Phones / tablets: pill tabs on top, section below */
        <Box>
          <NavPills items={sections} value={current.key} onChange={selectSection} />
          <PanelHeader section={current} />
          {panel[current.key]}
        </Box>
      )}

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Box>
  );
}