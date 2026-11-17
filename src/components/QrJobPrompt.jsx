// src/components/QrJobPrompt.jsx
//
// Finishes a job QR-code visit once the candidate is inside the portal.
// Rendered once in CandidateLayout, so it runs for BOTH:
//   • an existing candidate who scanned the QR and simply signed in, and
//   • a new candidate who registered from the QR (registration already got the job_id).
//
// What it does when a QR job id is remembered (see utils/qrJob.js):
//   1. Already in "My applications"?  → toast "Application submitted", done.
//   2. Not yet applied                → dialog "Apply to this job?" → POST /candidates/jobs/apply
//   3. Applications locked            → dialog explains why, no Apply button.
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  useGetAppliedJobsQuery,
  useLazyGetMatchedJobsByCountryQuery,
  useApplyToJobMutation,
} from "../services/candidateJobsApi";
import { getQrJobId, clearQrJobId } from "../utils/qrJob";

const INK = "#1F2937";
const MUTED = "#6B7280";
const PRIMARY = "#2B6F71";
const PRIMARY_DARK = "#1E4F50";
const TINT = "#EAF5F4";
const WARN = "#B7791F";

// Countries the Jobs page supports — used to find the job's title/location
const COUNTRIES = ["India", "US"];

const apiMessage = (err) => {
  const d = err?.data;
  if (typeof d === "string") return d;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail)) return d.detail.map((x) => x?.msg).filter(Boolean).join(", ");
  return d?.detail?.message || d?.message || "";
};

export default function QrJobPrompt() {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const [jobId] = useState(() => getQrJobId());
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState(null); // { job_title, city, country, organisation }
  const handled = useRef(false);

  const applied = useGetAppliedJobsQuery({ page: 1, pageSize: 100 }, { skip: !jobId });
  const [loadJobs] = useLazyGetMatchedJobsByCountryQuery();
  const [applyToJob, { isLoading: applying }] = useApplyToJobMutation();

  const appliedData = applied.data?.items ? applied.data : applied.data?.data;
  const locked = !!appliedData?.is_application_locked;

  const alreadyApplied = useMemo(
    () => (appliedData?.items || []).find((i) => String(i.job_id) === String(jobId)),
    [appliedData, jobId]
  );

  // Jobs page → "My applications" tab. The tab is in the URL so it also works
  // when the candidate is already on the Jobs page.
  const goToApplications = () =>
    navigate("/for-candidate/requisitions?tab=applications", { state: { tab: "applications" } });

  // Decide once the applications list has loaded
  useEffect(() => {
    if (!jobId || handled.current || applied.isLoading || applied.isFetching) return;
    if (applied.isError) return; // try again on the next page load
    handled.current = true;

    if (alreadyApplied) {
      // e.g. registration with job_id already applied them
      clearQrJobId();
      toast.success(`Your application for "${alreadyApplied.job_title || "the job"}" is submitted`);
      goToApplications();
      return;
    }

    // Find the job's title / location to show in the dialog (best effort)
    (async () => {
      for (const c of COUNTRIES) {
        try {
          const res = await loadJobs({ country: c }, true).unwrap();
          const found = (res?.data?.jobs || []).find((j) => String(j.job_id) === String(jobId));
          if (found) {
            setJob(found);
            break;
          }
        } catch {
          /* ignore — the dialog works without the title */
        }
      }
      setOpen(true);
    })();
  }, [jobId, applied.isLoading, applied.isFetching, applied.isError, alreadyApplied, loadJobs]);

  const close = () => {
    clearQrJobId();
    setOpen(false);
  };

  const handleApply = async () => {
    try {
      const res = await applyToJob(jobId).unwrap();
      if (res?.success === false) throw { data: res };
      toast.success(res?.message || "Application submitted");
      close();
      goToApplications();
    } catch (err) {
      const msg = apiMessage(err);
      if (err?.status === 409 || /already applied/i.test(msg)) {
        toast.info("You've already applied to this job.");
        close();
        goToApplications();
      } else {
        toast.error(msg || "Couldn't apply to this job. Please try again.");
      }
    }
  };

  if (!jobId) return null;

  const location = [job?.city, job?.country]
    .flatMap((p) => String(p || "").split(","))
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog
      open={open}
      onClose={applying ? undefined : close}
      fullWidth
      maxWidth="xs"
      fullScreen={false}
      PaperProps={{ sx: { borderRadius: "16px", m: isPhone ? 2 : 4 } }}
    >
      <DialogContent sx={{ pt: 3, pb: 1, textAlign: "center" }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 1.5,
            borderRadius: "50%",
            bgcolor: TINT,
            color: PRIMARY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QrCode2RoundedIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontWeight: 700, fontSize: 18, color: INK }}>
          {locked ? "Applications are paused" : "Apply to this job?"}
        </Typography>
        <Typography sx={{ fontSize: 13, color: MUTED, mt: 0.75, lineHeight: 1.55 }}>
          {locked
            ? appliedData?.lock_reason || "You can't apply to new jobs right now."
            : "You opened this job from a QR code. Apply now with your Ri8fit profile."}
        </Typography>

        {(job?.job_title || location) && (
          <Box
            sx={{
              mt: 2,
              p: 1.75,
              textAlign: "left",
              border: "1px solid #E1E5E7",
              borderRadius: "12px",
              bgcolor: "#F8FAF9",
            }}
          >
            {job?.job_title && (
              <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{job.job_title}</Typography>
            )}
            {job?.organisation?.organisation_name && (
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: PRIMARY_DARK, mt: 0.25 }}>
                {job.organisation.organisation_name}
              </Typography>
            )}
            {location && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                <PlaceRoundedIcon sx={{ fontSize: 15, color: MUTED }} />
                <Typography sx={{ fontSize: 12.5, color: MUTED }}>{location}</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          gap: 1,
          flexDirection: { xs: "column-reverse", sm: "row" },
          "& > :not(style) ~ :not(style)": { ml: { xs: 0, sm: 1 } },
          "& .MuiButton-root": { width: { xs: "100%", sm: "auto" }, flex: { sm: 1 }, minHeight: 42 },
        }}
      >
        <Button
          onClick={close}
          disabled={applying}
          variant="outlined"
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px", borderColor: "#E1E5E7", color: INK }}
        >
          {locked ? "Close" : "Not now"}
        </Button>
        {!locked && (
          <Button
            onClick={handleApply}
            disabled={applying}
            variant="contained"
            disableElevation
            startIcon={applying ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : null}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              bgcolor: PRIMARY,
              "&:hover": { bgcolor: PRIMARY_DARK },
              "&.Mui-disabled": { color: "#fff", bgcolor: PRIMARY, opacity: 0.85 },
            }}
          >
            {applying ? "Applying…" : "Apply now"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}