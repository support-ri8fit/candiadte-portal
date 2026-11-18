import React from "react";
import { Box, Typography, Chip, Button, CircularProgress } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import WorkHistoryOutlinedIcon from "@mui/icons-material/WorkHistoryOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import MilitaryTechOutlinedIcon from "@mui/icons-material/MilitaryTechOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

/* ── Brand tokens (same as the rest of the candidate portal) ─────────────── */
const INK = "#1F2937";
const MUTED = "#6B7280";
const PRIMARY = "#2B6F71";
const PRIMARY_DARK = "#1E4F50";
const PRIMARY_TINT = "#EAF5F4";
const BORDER = "#E1E5E7";
const SURFACE = "#F8FAF9";
const AMBER = "#B7791F";
const AMBER_TINT = "#FBF3E4";
const RED = "#B0433C";
const RED_TINT = "#FDEDEC";
const FONT_DISPLAY = "'Georgia', 'Times New Roman', serif";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
// Backend sometimes sends Swagger placeholders ("string") or empty values
const clean = (v) => {
  const t = v === null || v === undefined ? "" : String(v).trim();
  return !t || /^(string|null|undefined|n\/a|-|—)$/i.test(t) ? "" : t;
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const daysLeft = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.setHours(23, 59, 59, 999) - Date.now()) / 86400000);
};

// "Adoni,Andhra Pradesh" + "India" → "Adoni, Andhra Pradesh, India"
const formatLocation = (...parts) =>
  parts
    .flatMap((p) => String(p || "").split(","))
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

const toList = (v) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
    .map(clean)
    .filter(Boolean);

const priorityTone = (p) => {
  const v = (p || "").toLowerCase();
  if (v === "high") return { fg: RED, bg: RED_TINT };
  if (v === "medium") return { fg: AMBER, bg: AMBER_TINT };
  if (v === "low") return { fg: PRIMARY_DARK, bg: PRIMARY_TINT };
  return null;
};

/* ── Small pieces ────────────────────────────────────────────────────────── */
const Card = ({ children, sx }) => (
  <Box
    sx={{
      bgcolor: "#fff",
      border: `1px solid ${BORDER}`,
      borderRadius: "16px",
      p: { xs: 2.25, sm: 3 },
      minWidth: 0,
      ...sx,
    }}
  >
    {children}
  </Box>
);

const CardTitle = ({ icon: Icon, children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.75 }}>
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: "9px",
        bgcolor: PRIMARY_TINT,
        color: PRIMARY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon sx={{ fontSize: 17 }} />
    </Box>
    <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16.5, color: INK }}>
      {children}
    </Typography>
  </Box>
);

const MetaChip = ({ label }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      height: 26,
      fontSize: 12,
      fontWeight: 600,
      color: INK,
      bgcolor: SURFACE,
      border: `1px solid ${BORDER}`,
    }}
  />
);

/* Skill group — tone sets the chip colour */
const SKILL_TONES = {
  must: { fg: RED, bg: RED_TINT, border: "#F3C9C4", dot: RED },
  primary: { fg: PRIMARY_DARK, bg: PRIMARY_TINT, border: "#BFDCD9", dot: PRIMARY },
  nice: { fg: INK, bg: SURFACE, border: BORDER, dot: "#9CA3AF" },
};
const SkillGroup = ({ title, hint, items, tone }) => {
  if (!items.length) return null;
  const t = SKILL_TONES[tone];
  return (
    <Box sx={{ "& + &": { mt: 2.25 } }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: t.dot, flexShrink: 0, alignSelf: "center" }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: 12, color: MUTED }}>{hint}</Typography>}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {items.map((s) => (
          <Chip
            key={s}
            label={s}
            size="small"
            sx={{
              height: 28,
              fontSize: 12.5,
              fontWeight: 600,
              color: t.fg,
              bgcolor: t.bg,
              border: `1px solid ${t.border}`,
              "& .MuiChip-label": { px: 1.25 },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

/* One row in the "Job overview" side card */
const OverviewRow = ({ icon: Icon, label, children }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.25,
      py: 1.25,
      "& + &": { borderTop: `1px dashed ${BORDER}` },
    }}
  >
    <Icon sx={{ fontSize: 18, color: PRIMARY, flexShrink: 0 }} />
    <Typography sx={{ fontSize: 12.5, color: MUTED, flex: 1, minWidth: 0 }}>{label}</Typography>
    <Box sx={{ fontSize: 13.5, fontWeight: 600, color: INK, textAlign: "right", minWidth: 0 }}>{children}</Box>
  </Box>
);

/* ══════════════════════════════════════════════════════════════════════════
   applying  – the apply API is running
   locked    – the backend says this candidate can't apply right now
               (is_application_locked); lockReason explains why             */
const JobDetails = ({ job, applied, applying = false, locked = false, lockReason = "", onBack, onApply }) => {
  const company = clean(job.organisation?.organisation_name);
  const industry = clean(job.organisation?.industry);
  const location = formatLocation(job.city, job.country);
  const jobType = clean(job.job_type);
  const mode = clean(job.mode_of_work);
  const hasExp = job.min_years != null || job.max_years != null;
  const experience = hasExp ? `${job.min_years ?? 0}–${job.max_years ?? "?"} yrs` : "";
  const closes = formatDate(job.closing_date);
  const left = daysLeft(job.closing_date);
  const openings = Number(job.no_of_positions) || null;
  const grade = clean(job.grade_or_level);
  const workAuth = clean(job.workAuthorization);
  const salary =
    clean(job.salary_range_min) || clean(job.salary_range_max)
      ? `${clean(job.salary_range_min) || "—"} – ${clean(job.salary_range_max) || "—"}${
          clean(job.salary_unit) ? ` ${clean(job.salary_unit)}` : ""
        }`
      : "";
  const priority = clean(job.priority);
  const pTone = priorityTone(priority);

  const description =
    clean(job.summary_final) ||
    clean(job.summary_initial) ||
    clean(job.jobDescription) ||
    (job._fromApplication ? "The full job description isn't available here yet." : "No description provided.");

  const must = toList(job.mandatory);
  const primary = toList(job.primary);
  const secondary = toList(job.secondary);
  const tools = toList(job.programming_skills);
  const hasSkills = must.length || primary.length || secondary.length || tools.length;

  /* ── Apply button (states) ─────────────────────────────────────────── */
  const blocked = applied || applying || locked;
  const buttonLabel = applied ? "Applied" : applying ? "Applying…" : locked ? "Applications paused" : "Apply now";

  const ApplyButton = ({ fullWidth = false }) => (
    <Button
      onClick={() => !blocked && onApply(job)}
      disabled={blocked}
      fullWidth={fullWidth}
      aria-busy={applying}
      startIcon={
        applied ? (
          <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
        ) : applying ? (
          <CircularProgress size={16} sx={{ color: "inherit" }} />
        ) : locked ? (
          <LockOutlinedIcon sx={{ fontSize: 17 }} />
        ) : null
      }
      sx={{
        textTransform: "none",
        fontWeight: 700,
        fontSize: 14.5,
        borderRadius: "10px",
        px: 3,
        minHeight: 44,
        whiteSpace: "nowrap",
        color: applied ? PRIMARY_DARK : "#fff",
        bgcolor: applied ? PRIMARY_TINT : PRIMARY,
        border: applied ? `1px solid ${PRIMARY}` : "none",
        boxShadow: applied ? "none" : "0 6px 16px rgba(43,111,113,0.25)",
        "&:hover": { bgcolor: applied ? PRIMARY_TINT : PRIMARY_DARK },
        "&.Mui-disabled": applied
          ? { color: PRIMARY_DARK, bgcolor: PRIMARY_TINT }
          : applying
          ? { color: "#fff", bgcolor: PRIMARY, opacity: 0.85 }
          : { color: MUTED, bgcolor: "#F3F4F6", boxShadow: "none" },
      }}
    >
      {buttonLabel}
    </Button>
  );

  return (
    <Box
      sx={{
        maxWidth: 1180,
        mx: "auto",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        // space from the sidebar / top bar (the layout itself adds no padding)
        px: { xs: 2, sm: 3, md: 4 },
        pt: { xs: 2, sm: 3 },
        pb: { xs: 12, sm: 4 }, // phones: room for the fixed Apply bar
      }}
    >
      {/* ── Back ── */}
      <Button
        onClick={onBack}
        startIcon={<ArrowBackRoundedIcon />}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          fontSize: 14,
          color: PRIMARY_DARK,
          px: 1,
          mb: 1.5,
          ml: -1,
          "&:hover": { bgcolor: PRIMARY_TINT },
        }}
      >
        Back to jobs
      </Button>

      {/* ── Hero ── */}
      <Card sx={{ p: 0, overflow: "hidden", mb: 2 }}>
        <Box sx={{ height: 6, background: `linear-gradient(90deg, ${PRIMARY_DARK}, ${PRIMARY}, #3E9A93)` }} />
        <Box
          sx={{
            p: { xs: 2.25, sm: 3 },
            display: "flex",
            gap: { xs: 1.75, sm: 2.5 },
            alignItems: "flex-start",
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          {/* Company initial */}
          <Box
            sx={{
              width: { xs: 52, sm: 60 },
              height: { xs: 52, sm: 60 },
              borderRadius: "14px",
              bgcolor: PRIMARY_TINT,
              color: PRIMARY_DARK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: { xs: 22, sm: 26 },
              flexShrink: 0,
              border: `1px solid #BFDCD9`,
            }}
          >
            {(company || job.job_title || "J").trim()[0].toUpperCase()}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography
                component="h1"
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: { xs: 22, sm: 27 },
                  color: INK,
                  lineHeight: 1.2,
                  overflowWrap: "anywhere",
                }}
              >
                {job.job_title || "Job"}
              </Typography>
              {applied && (
                <Chip
                  icon={<CheckCircleRoundedIcon sx={{ fontSize: 15 }} />}
                  label="Applied"
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: PRIMARY_DARK,
                    bgcolor: PRIMARY_TINT,
                    border: `1px solid ${PRIMARY}`,
                    "& .MuiChip-icon": { color: PRIMARY },
                  }}
                />
              )}
            </Box>

            {(company || industry) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}>
                <BusinessRoundedIcon sx={{ fontSize: 17, color: PRIMARY }} />
                {company && (
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: PRIMARY_DARK }}>{company}</Typography>
                )}
                {industry && <Typography sx={{ fontSize: 13.5, color: MUTED }}>· {industry}</Typography>}
              </Box>
            )}

            <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5, mt: 0.75 }}>
              {location && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 17, color: MUTED }} />
                  <Typography sx={{ fontSize: 13.5, color: MUTED }}>{location}</Typography>
                </Box>
              )}
              {job.job_position_id && (
                <Typography sx={{ fontSize: 13, color: "#9CA3AF" }}>ID: {job.job_position_id}</Typography>
              )}
            </Box>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
              {jobType && <MetaChip label={jobType} />}
              {mode && <MetaChip label={mode} />}
              {experience && <MetaChip label={`${experience} experience`} />}
              {openings && <MetaChip label={`${openings} opening${openings === 1 ? "" : "s"}`} />}
            </Box>
          </Box>

          {/* Apply — desktop / tablet */}
          <Box sx={{ display: { xs: "none", sm: "block" }, flexShrink: 0 }}>
            <ApplyButton />
            {left !== null && left >= 0 && left <= 7 && !applied && (
              <Typography sx={{ fontSize: 12, color: AMBER, mt: 0.75, textAlign: "center", fontWeight: 600 }}>
                {left === 0 ? "Closes today" : `Closes in ${left} day${left === 1 ? "" : "s"}`}
              </Typography>
            )}
          </Box>
        </Box>
      </Card>

      {/* ── Body: content + overview ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 320px" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* Left */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <Card>
            <CardTitle icon={DescriptionOutlinedIcon}>About the role</CardTitle>
            <Typography
              sx={{
                fontSize: { xs: 14, sm: 15 },
                color: "#374151",
                lineHeight: 1.75,
                whiteSpace: "pre-line",
                overflowWrap: "anywhere",
              }}
            >
              {description}
            </Typography>
          </Card>

          {hasSkills ? (
            <Card>
              <CardTitle icon={PsychologyOutlinedIcon}>Skills & requirements</CardTitle>
              <SkillGroup title="Must have" items={must} tone="must" />
              <SkillGroup title="Primary skills" items={primary} tone="primary" />
              <SkillGroup title="Good to have" items={secondary} tone="nice" />
              <SkillGroup title="Tools & programming" items={tools} tone="nice" />
            </Card>
          ) : null}
        </Box>

        {/* Right — job overview (sticky on desktop) */}
        <Box sx={{ position: { md: "sticky" }, top: { md: 88 }, minWidth: 0 }}>
          <Card sx={{ p: { xs: 2.25, sm: 2.5 } }}>
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16.5, color: INK, mb: 0.5 }}>
              Job overview
            </Typography>

            {closes && (
              <OverviewRow icon={EventOutlinedIcon} label="Closes">
                {closes}
              </OverviewRow>
            )}
            {openings && (
              <OverviewRow icon={GroupsOutlinedIcon} label="Openings">
                {openings}
              </OverviewRow>
            )}
            {experience && (
              <OverviewRow icon={WorkHistoryOutlinedIcon} label="Experience">
                {experience}
              </OverviewRow>
            )}
            {salary && (
              <OverviewRow icon={PaymentsOutlinedIcon} label="Salary">
                {salary}
              </OverviewRow>
            )}
            {grade && (
              <OverviewRow icon={MilitaryTechOutlinedIcon} label="Grade">
                {grade}
              </OverviewRow>
            )}
            {workAuth && (
              <OverviewRow icon={VerifiedUserOutlinedIcon} label="Work auth">
                {workAuth}
              </OverviewRow>
            )}
            {priority && pTone && (
              <OverviewRow icon={FlagOutlinedIcon} label="Priority">
                <Chip
                  label={priority}
                  size="small"
                  sx={{ height: 22, fontSize: 11.5, fontWeight: 700, color: pTone.fg, bgcolor: pTone.bg, textTransform: "capitalize" }}
                />
              </OverviewRow>
            )}

            <Box sx={{ mt: 1.5 }}>
              <ApplyButton fullWidth />
              {locked && !applied && lockReason && (
                <Typography sx={{ fontSize: 12, color: AMBER, mt: 1, lineHeight: 1.5 }}>{lockReason}</Typography>
              )}
            </Box>
          </Card>
        </Box>
      </Box>

      {/* ── Phone: sticky apply bar ── */}
      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1200,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          px: 2,
          py: 1.25,
          pb: "calc(10px + env(safe-area-inset-bottom))",
          bgcolor: "#fff",
          borderTop: `1px solid ${BORDER}`,
          boxShadow: "0 -6px 18px rgba(31,41,55,0.08)",
        }}
      >
        <Typography sx={{ fontSize: 12.5, color: MUTED, minWidth: 0 }}>
          {closes ? `Closes ${closes}` : ""}
        </Typography>
        <ApplyButton />
      </Box>
    </Box>
  );
};

export default JobDetails;