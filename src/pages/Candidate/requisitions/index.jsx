import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Button,
  Skeleton,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import {
  useGetMatchedJobsByCountryQuery,
  useLazyGetMatchedJobsByCountryQuery,
  useApplyToJobMutation,
  useGetAppliedJobsQuery,
} from "../../../services/candidateJobsApi.js"; // adjust path to wherever you place the api slice
import JobDetails from "./JobDetails.jsx";
import ThankYou from "./ThankYou.jsx";

/* ── Design tokens — same system used across the other candidate pages ── */
const INK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const PRIMARY = "#2B6F71";
const PRIMARY_DARK = "#1E4F50";
const PRIMARY_TINT = "#EAF5F4";
const SURFACE = "#F8FAF9";
const BORDER = "#E1E5E7";
const WARN = "#B7791F";
const WARN_TINT = "#FBF3E4";

const FONT_DISPLAY = "'Georgia', 'Times New Roman', serif";

/* ── Small flag icons (SVG, so they look the same on Windows, Mac and phones —
      Windows doesn't draw emoji flags) ───────────────────────────────── */
const FlagFrame = ({ children, size = 20 }) => (
  <Box
    component="span"
    sx={{
      width: size,
      height: Math.round(size * 0.7),
      borderRadius: "3px",
      overflow: "hidden",
      display: "inline-flex",
      flexShrink: 0,
      boxShadow: "0 0 0 1px rgba(31,41,55,0.12)",
      "& svg": { width: "100%", height: "100%", display: "block" },
    }}
  >
    {children}
  </Box>
);

const IndiaFlag = ({ size }) => (
  <FlagFrame size={size}>
    <svg viewBox="0 0 30 21" aria-hidden="true">
      <rect width="30" height="7" fill="#FF9933" />
      <rect y="7" width="30" height="7" fill="#FFFFFF" />
      <rect y="14" width="30" height="7" fill="#138808" />
      <circle cx="15" cy="10.5" r="2.6" fill="none" stroke="#000080" strokeWidth="0.7" />
      <circle cx="15" cy="10.5" r="0.6" fill="#000080" />
    </svg>
  </FlagFrame>
);

const USFlag = ({ size }) => (
  <FlagFrame size={size}>
    <svg viewBox="0 0 30 21" aria-hidden="true">
      <rect width="30" height="21" fill="#B22234" />
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect key={i} y={(i * 21) / 13} width="30" height={21 / 13} fill="#FFFFFF" />
      ))}
      <rect width="12.5" height={(21 * 7) / 13} fill="#3C3B6E" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <circle key={`${r}-${c}`} cx={2 + c * 2.8} cy={2.2 + r * 3.2} r="0.55" fill="#FFFFFF" />
        ))
      )}
    </svg>
  </FlagFrame>
);

// Global country filter options. `value` is what goes to the API (the api
// slice lowercases it); `label` is what the candidate sees.
const COUNTRY_OPTIONS = [
  { value: "India", label: "India", Flag: IndiaFlag },
  { value: "US", label: "United States", Flag: USFlag },
  // add more here, e.g. { value: "UK", label: "United Kingdom", Flag: UKFlag },
];

const countryOf = (value) => COUNTRY_OPTIONS.find((c) => c.value === value) || COUNTRY_OPTIONS[0];

/* ── Country picker ───────────────────────────────────────────────────── */
const CountrySelect = ({ value, onChange }) => (
  <Select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    size="small"
    inputProps={{ "aria-label": "Country" }}
    IconComponent={KeyboardArrowDownRoundedIcon}
    renderValue={(v) => {
      const c = countryOf(v);
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <c.Flag size={20} />
          <Typography component="span" sx={{ fontSize: 13.5, fontWeight: 500, color: INK }}>
            {c.label}
          </Typography>
        </Box>
      );
    }}
    MenuProps={{
      anchorOrigin: { vertical: "bottom", horizontal: "right" },
      transformOrigin: { vertical: "top", horizontal: "right" },
      PaperProps: {
        sx: {
          mt: 0.75,
          borderRadius: "12px",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 10px 28px rgba(31,41,55,0.10)",
          minWidth: 200,
          "& .MuiList-root": { p: 0.75 },
        },
      },
    }}
    sx={{
      width: { xs: "100%", sm: 200 },
      height: 40,
      borderRadius: "10px",
      bgcolor: "#fff",
      fontSize: 13.5,
      "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER },
      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: PRIMARY },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PRIMARY, borderWidth: "1.5px" },
      "& .MuiSelect-select": { display: "flex", alignItems: "center", py: 0, pl: 1.5 },
      "& .MuiSelect-icon": { color: TEXT_MUTED, fontSize: 20 },
      // 16px on touch screens stops iOS zooming in
      "@media (pointer: coarse)": { height: 44 },
    }}
  >
    {COUNTRY_OPTIONS.map((c) => {
      const selected = c.value === value;
      return (
        <MenuItem
          key={c.value}
          value={c.value}
          sx={{
            borderRadius: "8px",
            gap: 1.25,
            py: 1,
            fontSize: 13.5,
            fontWeight: selected ? 600 : 500,
            color: selected ? PRIMARY_DARK : INK,
            "&:hover, &.Mui-focusVisible": { bgcolor: SURFACE },
            "&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible": { bgcolor: PRIMARY_TINT },
          }}
        >
          <c.Flag size={22} />
          <Box component="span" sx={{ flex: 1 }}>
            {c.label}
          </Box>
          {selected && <CheckRoundedIcon sx={{ fontSize: 18, color: PRIMARY }} />}
        </MenuItem>
      );
    })}
  </Select>
);

/* ── Empty state ──────────────────────────────────────────────────────── */
const EmptyJobs = ({ country, onSwitchCountry, onRefresh, refreshing }) => {
  const current = countryOf(country);
  const others = COUNTRY_OPTIONS.filter((c) => c.value !== country);
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: `1px dashed ${BORDER}`,
        borderRadius: "14px",
        px: { xs: 2.5, sm: 4 },
        py: { xs: 4, sm: 5.5 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Box sx={{ position: "relative", mb: 2 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            bgcolor: PRIMARY_TINT,
            color: PRIMARY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WorkOutlineRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box
          sx={{
            position: "absolute",
            right: -4,
            bottom: 2,
            p: "3px",
            bgcolor: "#fff",
            borderRadius: "5px",
            display: "flex",
            boxShadow: "0 2px 6px rgba(31,41,55,0.12)",
          }}
        >
          <current.Flag size={20} />
        </Box>
      </Box>

      <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: INK }}>
        No open jobs in {current.label} yet
      </Typography>
      <Typography sx={{ fontSize: 13, color: TEXT_MUTED, mt: 0.75, maxWidth: 420, lineHeight: 1.6 }}>
        New roles that match your profile will show up here as soon as they're posted. Keeping your skills
        and experience up to date helps us find better matches.
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 1,
          mt: 2.5,
          width: { xs: "100%", sm: "auto" },
          "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
        }}
      >
        {others.map((c) => (
          <Button
            key={c.value}
            onClick={() => onSwitchCountry(c.value)}
            startIcon={<c.Flag size={18} />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              borderRadius: "10px",
              px: 2,
              minHeight: 38,
              color: "#fff",
              bgcolor: PRIMARY,
              "&:hover": { bgcolor: PRIMARY_DARK },
            }}
          >
            See jobs in {c.label}
          </Button>
        ))}
        <Button
          onClick={onRefresh}
          disabled={refreshing}
          startIcon={<RefreshRoundedIcon sx={{ fontSize: 18 }} />}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: 13,
            borderRadius: "10px",
            px: 2,
            minHeight: 38,
            color: PRIMARY_DARK,
            border: `1px solid ${BORDER}`,
            bgcolor: "#fff",
            "&:hover": { bgcolor: PRIMARY_TINT, borderColor: PRIMARY },
          }}
        >
          {refreshing ? "Checking…" : "Check again"}
        </Button>
      </Box>
    </Box>
  );
};

const formatDate = (iso) => {
  if (!iso) return "—";
  // "2026-11-16T18:09:53" has no time zone — the backend sends UTC, so read it as UTC
  const value =
    typeof iso === "string" && iso.includes("T") && !/(Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? `${iso}Z` : iso;
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

// const scoreTier = (score) => {
//   if (score >= 30) return { label: "SkillIntel Score", color: PRIMARY_DARK, bg: PRIMARY_TINT, border: PRIMARY };
//   if (score > 0) return { label: "Possible Match", color: WARN, bg: WARN_TINT, border: "#E4C588" };
//   return { label: "Low Match", color: TEXT_MUTED, bg: "#F3F4F6", border: BORDER };
// };

/* ── Single job card ─────────────────────────────────────────────────── */
const JobCard = ({ job, applied, onApply, onViewJob }) => {
  // const tier = scoreTier(job.skillintel_score);
  const location = [job.city, job.country]
    .flatMap((part) => String(part || "").split(","))
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <Box
      sx={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: "14px",
        p: 2.25,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        transition: "border-color .15s ease, box-shadow .15s ease",
        "&:hover": { borderColor: PRIMARY, boxShadow: "0 6px 18px rgba(31,41,55,0.07)" },
      }}
    >
      {/* Top row: title + match badge */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography
            onClick={() => onViewJob(job)}
            sx={{
              fontFamily: "sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.3,
              cursor: "pointer",
              "&:hover": { color: PRIMARY_DARK, textDecoration: "underline" },
            }}
          >
            {job.job_title}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: TEXT_MUTED, mt: 0.25 }}>
            {job.job_position_id}
          </Typography>
        </Box>
        {applied && (
          <Chip
            icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
            label="Applied"
            size="small"
            sx={{
              height: 24,
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              color: PRIMARY_DARK,
              bgcolor: PRIMARY_TINT,
              border: `1px solid ${PRIMARY}`,
              "& .MuiChip-icon": { color: PRIMARY },
            }}
          />
        )}
        {/* <Chip
          label={`${tier.label} · ${Math.round(job.skillintel_score)}%`}
          size="small"
          sx={{
            height: 24,
            fontSize: 11,
            fontWeight: 700,
            color: tier.color,
            bgcolor: tier.bg,
            border: `1px solid ${tier.border}`,
            flexShrink: 0,
          }}
        /> */}
      </Box>

      {/* Organisation */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <BusinessRoundedIcon sx={{ fontSize: 16, color: PRIMARY }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: PRIMARY_DARK }}>
          {job.organisation?.organisation_name || "—"}
        </Typography>
        {job.organisation?.industry && (
          <Typography sx={{ fontSize: 12, color: TEXT_MUTED }}>· {job.organisation.industry}</Typography>
        )}
      </Box>

      {/* Location */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <PlaceRoundedIcon sx={{ fontSize: 16, color: TEXT_MUTED }} />
        <Typography sx={{ fontSize: 12.5, color: TEXT_MUTED }}>
          {location || "Location not specified"}
        </Typography>
      </Box>

      {/* Meta chips: type, mode, experience, priority */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.25 }}>
        {job.job_type && (
          <Chip label={job.job_type} size="small" sx={{ height: 22, fontSize: 11, bgcolor: SURFACE, border: `1px solid ${BORDER}`, color: INK }} />
        )}
        {job.mode_of_work && (
          <Chip label={job.mode_of_work} size="small" sx={{ height: 22, fontSize: 11, bgcolor: SURFACE, border: `1px solid ${BORDER}`, color: INK }} />
        )}
        {(job.min_years || job.max_years) && (
          <Chip
            label={`${job.min_years ?? 0}–${job.max_years ?? "?"} yrs`}
            size="small"
            sx={{ height: 22, fontSize: 11, bgcolor: SURFACE, border: `1px solid ${BORDER}`, color: INK }}
          />
        )}
        {job.priority && (
          <Chip
            label={job.priority}
            size="small"
            sx={{ height: 22, fontSize: 11, bgcolor: "#FDEDEC", border: "1px solid #F3C9C4", color: "#B0433C", fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Footer: closing date + view job + apply */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75, pt: 1.25, borderTop: `1px solid ${BORDER}`, gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
          <EventRoundedIcon sx={{ fontSize: 15, color: TEXT_MUTED }} />
          <Typography sx={{ fontSize: 11.5, color: TEXT_MUTED }}>
            Closes {formatDate(job.closing_date)}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            onClick={() => onViewJob(job)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: "9px",
              px: 1.75,
              py: 0.6,
              color: applied ? PRIMARY_DARK : "#fff",
              bgcolor: applied ? PRIMARY_TINT : PRIMARY,
              border: applied ? `1px solid ${PRIMARY}` : "none",
              "&:hover": { bgcolor: applied ? PRIMARY_TINT : PRIMARY_DARK },
              "&.Mui-disabled": { color: PRIMARY_DARK, bgcolor: PRIMARY_TINT },
            }}
          >
            View Job
          </Button>

          {/* <Button
            onClick={() => onApply(job)}
            disabled={applied}
            startIcon={applied ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> : null}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: "9px",
              px: 2,
              py: 0.6,
              minWidth: 96,
              color: applied ? PRIMARY_DARK : "#fff",
              bgcolor: applied ? PRIMARY_TINT : PRIMARY,
              border: applied ? `1px solid ${PRIMARY}` : "none",
              "&:hover": { bgcolor: applied ? PRIMARY_TINT : PRIMARY_DARK },
              "&.Mui-disabled": { color: PRIMARY_DARK, bgcolor: PRIMARY_TINT },
            }}
          >
            {applied ? "Applied" : "Apply"}
          </Button> */}
        </Box>
      </Box>
    </Box>
  );
};

/* ── Tabs: Relevant jobs | My applications ─────────────────────────────── */
const ViewTabs = ({ value, onChange, appliedCount }) => {
  const tabs = [
    { key: "relevant", label: "Relevant jobs", Icon: PublicRoundedIcon },
    {
      key: "applications",
      label: `My applications${appliedCount ? ` (${appliedCount})` : ""}`,
      Icon: AssignmentTurnedInOutlinedIcon,
    },
  ];
  return (
    <Box
      role="tablist"
      sx={{
        display: "inline-flex",
        p: 0.5,
        gap: 0.5,
        mb: 2.5,
        bgcolor: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: "12px",
        boxSizing: "border-box",
        maxWidth: "100%",
        width: { xs: "100%", sm: "auto" },
      }}
    >
      {tabs.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <Box
            key={key}
            component="button"
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            sx={{
              all: "unset",
              boxSizing: "border-box",
              flex: { xs: 1, sm: "0 0 auto" },
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              px: { xs: 1, sm: 1.75 },
              minHeight: 36,
              borderRadius: "9px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: 13,
              fontWeight: 600,
              color: active ? "#fff" : INK,
              bgcolor: active ? PRIMARY : "transparent",
              transition: "background-color .15s ease",
              "@media (hover: hover)": { "&:hover": { bgcolor: active ? PRIMARY : PRIMARY_TINT } },
              "@media (pointer: coarse)": { minHeight: 42 },
              "&:focus-visible": { outline: `2px solid ${PRIMARY}`, outlineOffset: 2 },
            }}
          >
            <Icon sx={{ fontSize: 17, display: { xs: "none", sm: "inline-block" } }} />
            {label}
          </Box>
        );
      })}
    </Box>
  );
};

/* ── "You can't apply right now" banner (is_application_locked) ─────────── */
const LockBanner = ({ reason }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "flex-start",
      gap: 1.25,
      mb: 2,
      px: 1.75,
      py: 1.25,
      bgcolor: WARN_TINT,
      border: "1px solid #EBD3A6",
      borderRadius: "10px",
    }}
  >
    <LockOutlinedIcon sx={{ fontSize: 18, color: WARN, mt: "1px" }} />
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: WARN }}>Applications are paused</Typography>
      <Typography sx={{ fontSize: 12.5, color: TEXT_MUTED, mt: 0.25 }}>
        {reason || "You can't apply to new jobs right now. You can still view jobs and your applications."}
      </Typography>
    </Box>
  </Box>
);

/* ── Stage chip colours ───────────────────────────────────────────────── */
const stageTone = (item) => {
  if (item.is_blocked) return { color: "#B0433C", bg: "#FDEDEC", border: "#F3C9C4" };
  const s = String(item.stage || item.stage_label || "").toLowerCase();
  if (/hired|offer|selected/.test(s)) return { color: "#1E6B3A", bg: "#E8F5EC", border: "#B9DFC6" };
  if (/reject|declin|withdraw/.test(s)) return { color: "#B0433C", bg: "#FDEDEC", border: "#F3C9C4" };
  if (/interview|shortlist|screen/.test(s)) return { color: WARN, bg: WARN_TINT, border: "#EBD3A6" };
  return { color: PRIMARY_DARK, bg: PRIMARY_TINT, border: "#BFDCD9" };
};

/* ── One application row ──────────────────────────────────────────────── */
const ApplicationCard = ({ item, onView, opening }) => {
  const tone = stageTone(item);
  // "Hyderabad,Telangana" + "India" → "Hyderabad, Telangana, India"
  const location = [item.city, item.country]
    .flatMap((part) => String(part || "").split(","))
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  return (
    <Box
      sx={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: "14px",
        p: 2.25,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Typography
          onClick={() => onView(item)}
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: INK,
            lineHeight: 1.3,
            minWidth: 0,
            overflowWrap: "anywhere",
            cursor: "pointer",
            "&:hover": { color: PRIMARY_DARK, textDecoration: "underline" },
          }}
        >
          {item.job_title || "Job"}
        </Typography>
        <Chip
          size="small"
          icon={item.is_blocked ? <BlockRoundedIcon sx={{ fontSize: 14 }} /> : undefined}
          label={item.stage_label || item.stage || "Applied"}
          sx={{
            height: 24,
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            color: tone.color,
            bgcolor: tone.bg,
            border: `1px solid ${tone.border}`,
            "& .MuiChip-icon": { color: tone.color },
          }}
        />
      </Box>

      {item.company_name && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <BusinessRoundedIcon sx={{ fontSize: 16, color: PRIMARY }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: PRIMARY_DARK }}>{item.company_name}</Typography>
        </Box>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <PlaceRoundedIcon sx={{ fontSize: 16, color: TEXT_MUTED }} />
        <Typography sx={{ fontSize: 12.5, color: TEXT_MUTED }}>{location || "Location not specified"}</Typography>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {item.job_type && (
          <Chip label={item.job_type} size="small" sx={{ height: 22, fontSize: 11, bgcolor: SURFACE, border: `1px solid ${BORDER}`, color: INK }} />
        )}
        {item.mode_of_work && (
          <Chip label={item.mode_of_work} size="small" sx={{ height: 22, fontSize: 11, bgcolor: SURFACE, border: `1px solid ${BORDER}`, color: INK }} />
        )}
        {!item.job_is_open && (
          <Chip label="Job closed" size="small" sx={{ height: 22, fontSize: 11, bgcolor: "#F3F4F6", border: `1px solid ${BORDER}`, color: TEXT_MUTED }} />
        )}
      </Box>

      {item.is_blocked && item.blocked_reason && (
        <Typography sx={{ fontSize: 12, color: "#B0433C" }}>{item.blocked_reason}</Typography>
      )}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 0.75, mt: 0.5, pt: 1.25, borderTop: `1px solid ${BORDER}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
          <EventRoundedIcon sx={{ fontSize: 15, color: TEXT_MUTED }} />
          <Typography sx={{ fontSize: 11.5, color: TEXT_MUTED }}>Applied {formatDate(item.applied_at)}</Typography>
        </Box>
        <Button
          onClick={() => onView(item)}
          disabled={opening}
          startIcon={opening ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : null}
          sx={{
            order: 3,
            ml: "auto",
            textTransform: "none",
            fontWeight: 700,
            fontSize: 12.5,
            borderRadius: "9px",
            px: 1.75,
            py: 0.6,
            color: "#fff",
            bgcolor: PRIMARY,
            "&:hover": { bgcolor: PRIMARY_DARK },
            "&.Mui-disabled": { color: "#fff", bgcolor: PRIMARY, opacity: 0.8 },
          }}
        >
          {opening ? "Opening…" : "View Job"}
        </Button>
        {/* only when the stage has changed since applying (more than a minute later) */}
        {item.stage_updated_at &&
          Math.abs(new Date(`${item.stage_updated_at}`.replace(/Z?$/, "Z")) - new Date(`${item.applied_at}`.replace(/Z?$/, "Z"))) > 60000 && (
          <Typography sx={{ fontSize: 11.5, color: TEXT_MUTED }}>Updated {formatDate(item.stage_updated_at)}</Typography>
        )}
      </Box>
    </Box>
  );
};

/* ── My applications list ─────────────────────────────────────────────── */
const ApplicationsList = ({ query, onBrowse, onView, openingId }) => {
  const { data, isLoading, isError, error, refetch } = query;
  const items = data?.items || data?.data?.items || [];

  if (isLoading) {
    return (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 1.5 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={170} sx={{ borderRadius: "14px" }} />
        ))}
      </Box>
    );
  }
  if (isError) {
    return (
      <Box sx={{ background: WARN_TINT, borderRadius: "10px", p: 2 }}>
        <Typography sx={{ fontSize: 13.5, color: WARN, fontWeight: 600 }}>Couldn't load your applications.</Typography>
        <Typography sx={{ fontSize: 12.5, color: TEXT_MUTED, mt: 0.5 }}>
          {error?.data?.message || (typeof error?.data?.detail === "string" ? error.data.detail : "") || "Please try again."}
        </Typography>
        <Button onClick={() => refetch()} size="small" sx={{ mt: 1, textTransform: "none", fontWeight: 600, color: PRIMARY_DARK }}>
          Retry
        </Button>
      </Box>
    );
  }
  if (!items.length) {
    return (
      <Box
        sx={{
          bgcolor: "#fff",
          border: `1px dashed ${BORDER}`,
          borderRadius: "14px",
          px: { xs: 2.5, sm: 4 },
          py: { xs: 4, sm: 5 },
          textAlign: "center",
        }}
      >
        <Box sx={{ width: 56, height: 56, mx: "auto", mb: 1.5, borderRadius: "50%", bgcolor: PRIMARY_TINT, color: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 26 }} />
        </Box>
        <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: INK }}>
          No applications yet
        </Typography>
        <Typography sx={{ fontSize: 13, color: TEXT_MUTED, mt: 0.75 }}>
          Jobs you apply to will show up here with their latest status.
        </Typography>
        <Button
          onClick={onBrowse}
          sx={{ mt: 2, textTransform: "none", fontWeight: 600, fontSize: 13, borderRadius: "10px", px: 2, color: "#fff", bgcolor: PRIMARY, "&:hover": { bgcolor: PRIMARY_DARK } }}
        >
          Browse relevant jobs
        </Button>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 1.5 }}>
      {items.map((item) => (
        <ApplicationCard
          key={item.application_id || item.job_id}
          item={item}
          onView={onView}
          opening={openingId === (item.application_id || item.job_id)}
        />
      ))}
    </Box>
  );
};

/* Readable message from an RTK Query error */
const apiMessage = (err) => {
  const d = err?.data;
  if (typeof d === "string") return d;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail)) return d.detail.map((x) => x?.msg).filter(Boolean).join(", ");
  return d?.detail?.message || d?.message || "";
};

const CandidateRequisitions = () => {
  const [country, setCountry] = useState("India");
  // tab: "relevant" | "applications" — another page can open a tab via
  // navigate("/for-candidate/requisitions", { state: { tab: "applications" } })
  const routerLocation = useLocation();
  const tabFromRoute = () =>
    new URLSearchParams(routerLocation.search).get("tab") === "applications" ||
    routerLocation.state?.tab === "applications"
      ? "applications"
      : "relevant";
  const [tab, setTab] = useState(tabFromRoute);
  // ?job=<id> (from a QR apply) → open that job's details on top of My applications
  const [pendingJobId, setPendingJobId] = useState(
    () => new URLSearchParams(routerLocation.search).get("job") || ""
  );
  // Opened again with ?tab=applications while already on this page (e.g. after a
  // QR apply) → switch tab; with ?job= also open that job.
  useEffect(() => {
    const jobParam = new URLSearchParams(routerLocation.search).get("job") || "";
    if (tabFromRoute() === "applications") {
      setTab("applications");
      setView("list");
      setSelectedJob(null);
    }
    if (jobParam) setPendingJobId(jobParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.key]);
  // view: "list" | "details" | "thankyou"
  const [view, setView] = useState("list");

  // Applications come from GET /candidates/jobs/applied; jobs applied to in
  // this session are added straight away so the button flips to "Applied".
  const appliedQuery = useGetAppliedJobsQuery({ page: 1, pageSize: 100 });
  const appliedData = appliedQuery.data?.items ? appliedQuery.data : appliedQuery.data?.data;
  const [justApplied, setJustApplied] = useState(() => new Set());
  const appliedJobIds = useMemo(() => {
    const ids = new Set(justApplied);
    (appliedData?.items || []).forEach((i) => i?.job_id && ids.add(String(i.job_id)));
    return ids;
  }, [appliedData, justApplied]);
  const isApplied = (job) => !!job && appliedJobIds.has(String(job.job_id));
  const applicationLocked = !!appliedData?.is_application_locked;
  const lockReason = appliedData?.lock_reason || "";
  const appliedCount = appliedData?.total ?? (appliedData?.items || []).length;

  const [applyToJob, { isLoading: applying }] = useApplyToJobMutation();
  const [selectedJob, setSelectedJob] = useState(null);

  // const { data, isLoading, isFetching, isError, error, refetch } =
  //   useGetMatchedJobsByCountryQuery({ country, minScore: 0 });
  const { data, isLoading, isFetching, isError, error, refetch } =
  useGetMatchedJobsByCountryQuery({ country });

  const jobs = useMemo(() => data?.data?.jobs || [], [data]);

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setView("details");
  };

  // POST /candidates/jobs/apply { job_id }
  const handleApply = async (job) => {
    if (!job?.job_id || applying || isApplied(job)) return;
    const markApplied = () => setJustApplied((prev) => new Set(prev).add(String(job.job_id)));
    try {
      const res = await applyToJob(job.job_id).unwrap();
      // some APIs answer 200 with { success:false } — treat as a failure
      if (res?.success === false) throw { data: res };
      markApplied();
      toast.success(res?.message || `Applied to "${job.job_title}"`);
      setSelectedJob(job);
      setView("thankyou");
    } catch (err) {
      const msg = apiMessage(err);
      if (err?.status === 409 || /already applied/i.test(msg)) {
        markApplied();
        toast.info("You've already applied to this job.");
      } else {
        toast.error(msg || "Couldn't apply to this job. Please try again.");
      }
    }
  };

  // Open an application's job. There is no candidate "job by id" API, so the
  // full job is looked up in the matched-jobs list (current country first, then
  // the application's country). If it isn't there, the details screen is built
  // from what the application has (title, location, type, mode).
  const [loadMatchedJobs] = useLazyGetMatchedJobsByCountryQuery();
  const [openingId, setOpeningId] = useState(null);
  const handleViewApplication = async (item) => {
    const id = String(item.job_id);
    const key = item.application_id || item.job_id;
    let job = jobs.find((j) => String(j.job_id) === id);
    if (!job && item.country && item.country.toLowerCase() !== String(country).toLowerCase()) {
      setOpeningId(key);
      try {
        const res = await loadMatchedJobs({ country: item.country }, true).unwrap();
        job = (res?.data?.jobs || []).find((j) => String(j.job_id) === id);
      } catch {
        /* fall back to the application's own details */
      }
      setOpeningId(null);
    }
    setSelectedJob(
      job || {
        job_id: item.job_id,
        job_title: item.job_title,
        city: item.city,
        country: item.country,
        mode_of_work: item.mode_of_work,
        job_type: item.job_type,
        organisation: item.company_name ? { organisation_name: item.company_name } : undefined,
        _fromApplication: true, // only the application's fields are known
      }
    );
    setView("details");
  };

  // Open the job asked for in ?job=<id> (QR visit) once we have enough data
  const lookupRef = React.useRef("");
  useEffect(() => {
    if (!pendingJobId) return;
    const id = String(pendingJobId);
    const st = routerLocation.state || {};
    const done = () => {
      setPendingJobId("");
      // drop ?job= from the address bar so a refresh / Back shows the list
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("job");
        window.history.replaceState(window.history.state, "", url.pathname + url.search);
      } catch {
        /* ignore */
      }
    };
    const open = (job) => {
      setSelectedJob(job);
      setView("details");
      done();
    };

    // 1. The full job was passed along → open right away
    if (st.job && String(st.job.job_id) === id) return open(st.job);

    // 2. Wait for this country's jobs + the applications list
    if (appliedQuery.isLoading || isLoading) return;
    const inJobs = jobs.find((j) => String(j.job_id) === id);
    if (inJobs) return open(inJobs);

    // 3. Not in this country's list — look in the other countries once
    if (lookupRef.current === id) return;
    lookupRef.current = id;
    (async () => {
      for (const c of COUNTRY_OPTIONS.map((o) => o.value).filter((v) => v !== country)) {
        try {
          const res = await loadMatchedJobs({ country: c }, true).unwrap();
          const found = (res?.data?.jobs || []).find((j) => String(j.job_id) === id);
          if (found) {
            setCountry(c); // so Back shows that country's list
            return open(found);
          }
        } catch {
          /* try the next country */
        }
      }
      // 4. Only the application is known → show what it has
      const app =
        (appliedData?.items || []).find((i) => String(i.job_id) === id) ||
        (st.application && String(st.application.job_id) === id ? st.application : null);
      if (app) {
        handleViewApplication(app);
        done();
        return;
      }
      // 5. Nothing found — the job is closed or not open to this candidate
      if (st.fromQr) toast.info("This job is no longer open or isn't available for your profile.");
      done();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJobId, appliedData, jobs, appliedQuery.isLoading, isLoading]);

  const handleBackToList = () => {
    setSelectedJob(null);
    setView("list");
  };

  // ── Job details view ────────────────────────────────────────────────
  if (view === "details" && selectedJob) {
    return (
      <JobDetails
        job={selectedJob}
        applied={isApplied(selectedJob)}
        applying={applying}
        locked={applicationLocked}
        lockReason={lockReason}
        onBack={handleBackToList}
        onApply={handleApply}
      />
    );
  }

  // ── Thank you view ──────────────────────────────────────────────────
  if (view === "thankyou" && selectedJob) {
    return (
      <ThankYou
        job={selectedJob}
        onBackToList={() => {
          handleBackToList();
          setTab("applications"); // show the new application in the list
        }}
      />
    );
  }

  // ── Job list view ───────────────────────────────────────────────────
  return (
    <Box
      sx={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: "14px",
        p: { xs: 2.5, sm: 3 },
      }}
    >
      {/* ── Header + country filter ───────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: PRIMARY_TINT,
              color: PRIMARY_DARK,
            }}
          >
            {tab === "relevant" ? (
              <PublicRoundedIcon sx={{ fontSize: 18 }} />
            ) : (
              <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 18 }} />
            )}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, color: INK, lineHeight: 1.2 }}>
              {tab === "relevant" ? "Relevant Jobs" : "My Applications"}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: TEXT_MUTED, mt: 0.25 }}>
              {tab === "relevant"
                ? isFetching
                  ? "Refreshing…"
                  : `${jobs.length} open role${jobs.length === 1 ? "" : "s"} in ${countryOf(country).label}`
                : appliedQuery.isFetching
                ? "Refreshing…"
                : `${appliedCount} application${appliedCount === 1 ? "" : "s"}`}
            </Typography>
          </Box>
        </Box>

        {/* Global country filter — changing this re-queries the API with the new country */}
        {tab === "relevant" && <CountrySelect value={country} onChange={setCountry} />}
      </Box>

      {/* ── Relevant jobs | My applications ───────────────────────────── */}
      <ViewTabs value={tab} onChange={setTab} appliedCount={appliedCount} />

      {/* Backend says this candidate can't apply right now */}
      {applicationLocked && <LockBanner reason={lockReason} />}

      {tab === "applications" && (
        <ApplicationsList
          query={appliedQuery}
          onBrowse={() => setTab("relevant")}
          onView={handleViewApplication}
          openingId={openingId}
        />
      )}

      {tab === "relevant" && (
      <>

      {/* ── Loading state ──────────────────────────────────────────────── */}
      {isLoading && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 1.5 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={190} sx={{ borderRadius: "14px" }} />
          ))}
        </Box>
      )}

      {/* ── Error state ────────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <Box sx={{ border: `1px solid ${WARN_TINT}`, background: WARN_TINT, borderRadius: "10px", p: 2 }}>
          <Typography sx={{ fontSize: 13.5, color: WARN, fontWeight: 600 }}>
            Couldn't load matched jobs.
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: TEXT_MUTED, mt: 0.5 }}>
            {error?.data?.message || error?.error || "Please try again."}
          </Typography>
          <Button onClick={() => refetch()} size="small" sx={{ mt: 1, textTransform: "none", fontWeight: 600, color: PRIMARY_DARK }}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {!isLoading && !isError && jobs.length === 0 && (
        <EmptyJobs
          country={country}
          onSwitchCountry={setCountry}
          onRefresh={() => refetch()}
          refreshing={isFetching}
        />
      )}

      {/* ── Job cards ──────────────────────────────────────────────────── */}
      {!isLoading && !isError && jobs.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 1.5 }}>
          {jobs.map((job) => (
            <JobCard
              key={job.job_id}
              job={job}
              applied={isApplied(job)}
              onApply={handleApply}
              onViewJob={handleViewJob}
            />
          ))}
        </Box>
      )}
      </>
      )}
    </Box>
  );
};

export default CandidateRequisitions; 