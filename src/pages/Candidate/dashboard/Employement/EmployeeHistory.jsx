import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { format, isValid } from "date-fns";
import AddEmployment from "./AddEmployeement.jsx";
import {
  useAddCandidateEmploymentMutation,
  useDeleteCandidateEmploymentMutation,
  useLazyGetCandidateEmploymentQuery,
  useUpdateCandidateEmploymentMutation,
} from "../../../../store/api/settings/CandidatePortalApis";
import { palette, fonts } from "../../../../theme/candidateTokens";

/* Device helpers — finger input gets 44px targets; hover effects only with a mouse */
const TOUCH = "@media (pointer: coarse)";
const HOVER = "@media (hover: hover)";

/* "2023-04-01" / "2023/04/01" → "Apr 2023". Anything it can't read is shown as-is. */
const formatMonthYear = (value) => {
  if (!value) return "";
  const d = new Date(String(value).replace(/\//g, "-"));
  return isValid(d) ? format(d, "MMM yyyy") : String(value);
};

/* One "Label: value" line, side by side. `stack` puts the label above the value
   on phones — used for the long Summary text so it gets the full width. */
const InfoLine = ({ label, children, stack = false }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: stack ? { xs: "column", sm: "row" } : "row",
      gap: stack ? { xs: 0.25, sm: 1 } : 1,
      alignItems: stack ? { xs: "stretch", sm: "baseline" } : "baseline",
      mt: 1,
      minWidth: 0,
    }}
  >
    <Typography
      sx={{
        fontSize: { xs: 12.5, sm: 13.5 },
        color: palette.ink,
        fontWeight: 600,
        flexShrink: 0,
        minWidth: { sm: 110 },
      }}
    >
      {label}
    </Typography>
    <Box sx={{ color: palette.muted, fontSize: { xs: 13, sm: 13.5 }, minWidth: 0, flex: 1 }}>
      {children}
    </Box>
  </Box>
);

/* Responsibilities text — 3 lines on every screen, "Show more" only when cut off.
   Defined OUTSIDE the main component so its open/closed state isn't reset on
   every re-render of the list. */
const SUMMARY_LINES = 3;
function SummaryToggle({ text }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => {
      if (!expanded) setOverflowing(el.scrollHeight - el.clientHeight > 1);
    };
    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [text, expanded]);

  if (!text) return null;
  return (
    <>
      <Typography
        ref={ref}
        sx={{
          color: palette.muted,
          fontSize: { xs: 13, sm: 13.5 },
          lineHeight: 1.6,
          whiteSpace: "pre-line",
          overflowWrap: "anywhere",
          ...(expanded
            ? {}
            : {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: SUMMARY_LINES,
                overflow: "hidden",
              }),
        }}
      >
        {text}
      </Typography>
      {(overflowing || expanded) && (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          endIcon={
            <ExpandMoreRoundedIcon
              sx={{ transition: "transform .2s ease", transform: expanded ? "rotate(180deg)" : "none" }}
            />
          }
          sx={{
            mt: 0.5,
            px: 0,
            minWidth: "unset",
            fontSize: 12.5,
            fontWeight: 700,
            textTransform: "none",
            color: palette.teal,
            "& .MuiButton-endIcon": { ml: 0.25 },
            "&:hover": { bgcolor: "transparent" },
            [HOVER]: { "&:hover": { textDecoration: "underline", textUnderlineOffset: "3px" } },
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </>
  );
}

const EmploymentForm = ({ employmentHistroyInfo, onSectionComplete }) => {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [employmentHistory, setEmploymentHistory] = useState([]);
  const [editingData, setEditingData] = useState(null);
  const [error, setError] = useState("");
  const [addCandidateEmployment] = useAddCandidateEmploymentMutation();
  const [updateCandidateEmployment] = useUpdateCandidateEmploymentMutation();
  const [deleteCandidateEmployment] = useDeleteCandidateEmploymentMutation();
  const [triggerGetCandidateEmployment, { data: employmentData }] =
    useLazyGetCandidateEmploymentQuery();
  const noticePeriodMap = {
    "15 Days or Less": 15,
    "1 Month": 30,
    "2 Months": 60,
    "3 Months": 90,
    "More then 3 Months": 120,
    "Serving Notice Period": 0,
  };
  const hasLiveDataRef = useRef(false);

  useEffect(() => {
    const liveEmployment = employmentData?.data;

    let sourceData;
    if (Array.isArray(liveEmployment) && liveEmployment.length > 0) {
      hasLiveDataRef.current = true;
      sourceData = liveEmployment;
    } else if (hasLiveDataRef.current) {
      // We've had good live data before; don't overwrite it with an
      // empty response — keep what's currently shown.
      return;
    } else {
      sourceData = employmentHistroyInfo?.employment || [];
    }

    if (sourceData.length) {
      const sortedData = [...sourceData].sort((a, b) => {
        const dateA = a.joining_date ? new Date(a.joining_date) : new Date(0);
        const dateB = b.joining_date ? new Date(b.joining_date) : new Date(0);
        return dateB - dateA;
      });
      setEmploymentHistory(sortedData);
    } else {
      setEmploymentHistory([]);
    }
  }, [employmentHistroyInfo, employmentData]);

  useEffect(() => {
    if (!employmentHistroyInfo) {
      triggerGetCandidateEmployment();
    }
  }, [employmentHistroyInfo]);

  // Tell the Profile Completion sidebar whether there is any employment
  // (includes jobs the resume parser already filled in)
  useEffect(() => {
    if (!employmentHistroyInfo && employmentData === undefined) return; // still loading
    onSectionComplete?.("employment", employmentHistory.length > 0);
  }, [employmentHistory.length, employmentHistroyInfo, employmentData, onSectionComplete]);

  // Compensation fields — same rules for current and latest-previous roles.
  // "Fixed" breakdown → the whole current salary is the fixed component.
  const buildCompensation = (data) => {
    const breakdown = data.salary_breakdown || "";
    const withStocks =
      breakdown === "Fixed + Stocks" || breakdown === "Fixed + Variable + Stocks";
    const withVariable =
      breakdown === "Fixed + Variable" || breakdown === "Fixed + Variable + Stocks";
    const current = Number(data.current_salary) || 0;
    const stocks = withStocks ? data.stock_types || [] : [];
    return {
      current_salary: current,
      salary_breakdown: breakdown,
      fixed_salary:
        breakdown === "Fixed" ? current : breakdown ? Number(data.fixed_salary) || 0 : 0,
      variable_salary: withVariable ? Number(data.variable_salary) || 0 : 0,
      stock_types: stocks,
      type_of_stocks: stocks.join(", "),
      value_of_stocks: withStocks ? Number(data.value_of_stocks) || 0 : 0,
    };
  };

  const getNumber = (value) => {
    if (!value) return 0;
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
  };

  // Comma-formats a saved salary value for display on the history card.
  // ₹ uses Indian grouping (12,34,567); other currencies use standard
  // thousands grouping (1,234,567).
  const formatSalaryDisplay = (value, currency) => {
    const num = Number(value);
    if (!value || isNaN(num)) return "";
    const locale = currency === "₹" ? "en-IN" : "en-US";
    return num.toLocaleString(locale);
  };

  const handleSave = useCallback(
    // AddEmployment.jsx's handleSave calls handleSaveEmployment(payload, localData) —
    // the already-API-formatted payload first, then the raw form state second.
    // Everything below expects the raw shape (Date objects for joining_date/
    // end_date/previousJoiningDate/previousEndingDate, boolean is_current, the
    // previousXxx fields, etc.), so we bind to the second argument. Binding to
    // the first (as `data`) previously caused joining_date/end_date to already
    // be pre-formatted strings, and format() on a string throws
    // "RangeError: Invalid time value".
    async (_builtPayload, data) => {
      let saveSucceeded = false;

      try {
        let response;
        let payload;

        // Common fields for both current and previous employment
        const basePayload = {
          key_responsibilities: data.key_responsibilities || "string", // Default or provided value
          total_exp_years: getNumber(data.total_exp_years),
          total_exp_months: getNumber(data.total_exp_months),
          overall_exp_months: 0,
          overall_exp_years: 0,
          skills_used: Array.isArray(data.skills_used)
            ? data.skills_used
            : data.skills_used?.split(",").map((s) => s.trim()) || [],
          is_relevant: data.is_relevant ?? true,
          // Expected salary is no longer asked — keep the saved value
          expected_salary: Number(editingData?.expected_salary) || 0,
        };

        if (data.is_current) {
          // Payload for current employment
          payload = {
            ...basePayload,
            id: editingData?.id || employmentHistroyInfo?.id,
            is_current: true,
            employment_type: data.employment_type || "",
            company_name: data.company_name || "",
            job_title: data.job_title || "",
            joining_date: data.joining_date
              ? format(data.joining_date, "yyyy/MM/dd")
              : null,
            end_date: data.end_date ? format(data.end_date, "yyyy/MM/dd") : null,
            currency: data.currency || "₹",
            // FIX: backend expects a valid decimal for these three fields.
            // Number("") is 0 (not NaN), so `Number(x) || 0` always yields a
            // real number — for blank input, for "Fixed"-only breakdowns
            // (fields below n/a), and for valid typed values alike — instead
            // of the empty string "" that was tripping the 422 decimal_parsing
            // error on save.
            ...buildCompensation(data),
            job_profile: data.job_profile || "",
            country: data.country || "",
            location: data.location || "",
            notice_period_days:
              noticePeriodMap[data.notice_period_days] ?? 0,
            duration: data.duration || "",
          };
        } else {
          // Payload for previous employment
          payload = {
            ...basePayload,
            id: editingData?.id || employmentHistroyInfo?.id,
            is_current: false,
            employment_type: data.previousEmployementType || "",
            company_name: data.previousCompany || "",
            job_title: data.previousJobTitle || "",
            joining_date: data.previousJoiningDate
              ? format(data.previousJoiningDate, "yyyy/MM/dd")
              : null,
            end_date: data.previousEndingDate
              ? format(data.previousEndingDate, "yyyy/MM/dd")
              : null,
            job_profile: data.previousJobProfile || "",
            currency: data.currency || "₹",
            // FIX: same decimal_parsing fix as the current-employment branch
            // above — was `data.current_salary || ""`, sending "" on blank.
            ...buildCompensation(data),
            country: "",
            location: "",
            notice_period_days: 0,
            duration: data.duration || "",
          };
        }

        if (editingData?.id) {
          response = await updateCandidateEmployment({
            id: editingData.id,
            body: payload,
          }).unwrap();
        } else {
          response = await addCandidateEmployment(payload).unwrap();
        }

        // The save itself succeeded at this point — everything after this
        // is best-effort refresh/reconciliation. Errors from here on
        // should NOT stop the dialog from closing, since the record is
        // already saved on the server.
        saveSucceeded = true;

        // FIX (confirmed via real API response): the update endpoint only
        // returns a tiny partial payload —
        // { employment_id, is_relevant, candidate_total_exp_years, candidate_total_exp_months } —
        // NOT the full updated record. Using that as `newEmployment` was
        // overwriting the full local record with a near-empty object
        // (missing company_name, job_title, employment_type, etc.), which
        // is why edited fields appeared to revert/go stale.
        //
        // For edits: don't touch local state from this response at all —
        // just wait for the GET refetch below to bring back the true,
        // complete record.
        //
        // For adds: keep the previous extraction, since the add endpoint
        // may return the full created record (unconfirmed) — but guard
        // against it also being partial, so we don't corrupt the list
        // either way.
        if (!editingData?.id) {
          const newEmployment =
            response?.data?.added?.[0] ||
            response?.data?.added ||
            response?.data ||
            response;

          const looksLikeFullRecord =
            newEmployment &&
            (newEmployment.company_name !== undefined ||
              newEmployment.job_title !== undefined);

          if (looksLikeFullRecord) {
            setEmploymentHistory((prev) => [newEmployment, ...prev]);
          }
          // If it doesn't look like a full record, skip the optimistic
          // insert — the upcoming GET refetch will bring in the real one.
        }

        // Refetch in the background — wrapped separately so a refetch
        // failure never blocks the dialog from closing (the record is
        // already saved either way).
        try {
          await triggerGetCandidateEmployment();
        } catch (refetchErr) {
          console.error("Refetch after save failed:", refetchErr);
        }

        setError("");
      } catch (err) {
        setError(
          err?.data?.message ||
          err?.message ||
          "Failed to save employment. Please try again."
        );
        console.error("API Error:", err);
      } finally {
        // Close the dialog whenever the actual save call succeeded,
        // regardless of what happened during the refetch/reconciliation
        // step above.
        if (saveSucceeded) {
          setOpen(false);
          setEditingIndex(null);
          setEditingData(null);
        }
      }
    },
    [editingData, editingIndex, employmentHistroyInfo]
  );

  const handleDelete = useCallback(async (employment) => {
    try {
      await deleteCandidateEmployment(employment?.id).unwrap();
      setEmploymentHistory((prev) =>
        prev.filter((e) => e.id !== employment.id)
      );
      await triggerGetCandidateEmployment();
    } catch (err) {
      setError(
        err?.data?.message ||
        err?.message ||
        "Failed to delete employment. Please try again."
      );
      console.error("API Error:", err);
    }
  }, []);

  const handleEditData = useCallback((employment, index) => {
    setEditingData(employment);
    setEditingIndex(index);
    setOpen(true);
  }, []);

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: palette.paper,
        border: `1px solid ${palette.line}`,
        borderRadius: "14px",
        p: { xs: 1.75, sm: 2.5, md: 3 },
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      {/* Header — icon + title left, Add right; always one line */}
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.25 }, minWidth: 0 }}>
          <Box
            sx={{
              width: { xs: 30, sm: 34 },
              height: { xs: 30, sm: 34 },
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: palette.tealSoft,
              color: palette.teal,
              flexShrink: 0,
            }}
          >
            <WorkOutlineOutlinedIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
          </Box>
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontWeight: 600,
              fontSize: { xs: 15.5, sm: 17 },
              color: palette.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Employment History
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          disableElevation
          startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
          aria-label="Add experience"
          sx={{
            bgcolor: palette.teal,
            textTransform: "none",
            fontWeight: 600,
            fontSize: { xs: 12.5, sm: 13 },
            borderRadius: "8px",
            px: { xs: 1.25, sm: 1.75 },
            minHeight: 34,
            whiteSpace: "nowrap",
            flexShrink: 0,
            "& .MuiButton-startIcon": { mr: { xs: 0.5, sm: 0.75 } },
            "&:hover": { bgcolor: palette.teal },
            [HOVER]: { "&:hover": { bgcolor: palette.tealDeep } },
            [TOUCH]: { minHeight: 40 },
          }}
          onClick={() => {
            setEditingIndex(null);
            setEditingData(null);
            setOpen(true);
          }}
        >
          {/* Short label on phones so it never wraps */}
          {isPhone ? "Add" : "Add Experience"}
        </Button>
      </Box>

      {error && (
        <Typography sx={{ color: palette.coral, fontSize: 13, mt: 1.5 }}>{error}</Typography>
      )}

      {employmentHistory.length === 0 && (
        <Typography sx={{ color: palette.muted, fontSize: { xs: 13, sm: 13.5 }, mt: 2 }}>
          No employment history added yet.
        </Typography>
      )}

      {employmentHistory.map((employment, index) => {
        const start = formatMonthYear(employment.joining_date);
        const end = employment.is_current
          ? "Present"
          : formatMonthYear(employment.end_date) || "Not specified";
        const place = [employment.location, employment.country].filter(Boolean).join(", ");

        return (
          <Box
            key={employment.id || index}
            sx={{
              mt: { xs: 1.5, sm: 2 },
              p: { xs: 1.5, sm: 2.25 },
              border: `1px solid ${palette.line}`,
              borderRadius: "10px",
              minWidth: 0,
              transition: "border-color .15s ease",
              [HOVER]: { "&:hover": { borderColor: palette.teal } },
            }}
          >
            {/* Title row — text on the left, actions on the right (no overlap) */}
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                  <Typography
                    sx={{
                      fontSize: { xs: 14, sm: 15 },
                      fontWeight: 600,
                      color: palette.ink,
                      lineHeight: 1.35,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {employment.job_title || "Untitled role"}
                  </Typography>
                  {employment.is_current && (
                    <Chip
                      label="Current"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10.5,
                        fontWeight: 600,
                        bgcolor: palette.tealSoft,
                        color: palette.teal,
                      }}
                    />
                  )}
                </Box>
                <Typography
                  sx={{
                    color: palette.teal,
                    fontSize: { xs: 13, sm: 14 },
                    fontWeight: 500,
                    mt: 0.25,
                    overflowWrap: "anywhere",
                  }}
                >
                  {employment.company_name}
                </Typography>
                {(start || end) && (
                  <Typography
                    sx={{ color: palette.muted, fontFamily: fonts.mono, fontSize: { xs: 11.5, sm: 12.5 }, mt: 0.25 }}
                  >
                    {start || "—"} – {end}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0, mt: -0.5, mr: -0.5 }}>
                <Tooltip title="Edit" arrow>
                  <IconButton
                    size="small"
                    aria-label="Edit employment"
                    sx={{ color: palette.teal, [TOUCH]: { p: 1.1 } }}
                    onClick={() => handleEditData(employment, index)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete" arrow>
                  <IconButton
                    size="small"
                    aria-label="Delete employment"
                    sx={{ color: palette.coral, [TOUCH]: { p: 1.1 } }}
                    onClick={() => handleDelete(employment)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <InfoLine label="Duration:">{employment.duration || "Not specified"}</InfoLine>

            {place && <InfoLine label="Location:">{place}</InfoLine>}

            {!!employment.current_salary && (
              <InfoLine label="Current Salary:">
                {employment.currency || "₹"}
                {formatSalaryDisplay(employment.current_salary, employment.currency)}
              </InfoLine>
            )}

            {employment.key_responsibilities && (
              <InfoLine label="Summary:" stack>
                <SummaryToggle text={employment.key_responsibilities} />
              </InfoLine>
            )}
          </Box>
        );
      })}

      <AddEmployment
        open={open}
        setOpen={setOpen}
        handleSaveEmployment={handleSave}
        editingData={editingData}
        editingIndex={editingIndex}
        // List is sorted newest first, so index 0 is the latest employment.
        // Compensation is only shown when editing that record (not on Add).
        isLatestEmployment={editingIndex === 0}
      />
    </Paper>
  );
};

export default React.memo(EmploymentForm);