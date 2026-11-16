// src/pages/Candidate/dashboard/CareerProfile/CareerProfileSection.jsx
//
// Career profile — what the candidate is looking for next.
//   GET  /candidates/get-careerprofile
//   POST /candidates/add-careerprofile                    body: [ { ...fields } ]   (first save)
//   PUT  /candidates/update-careerprofile/{careerprofile_id}  body: { ...fields }   (later saves)
//
// Dropdowns:
//   Industry        → /candidate-preferred-job-categories (can also type your own)
//   Department      → /functional-roles/functions
//   Role category   → /functional-roles/sub-functions/{function_key}  (for the chosen department)
//   Preferred shift → /candidate-preferred-work-shifts
//   Work locations  → /dropdown/locations?country=<country from Personal Details> (can also type)
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Typography, Button, Grid, TextField, Autocomplete, Chip, InputAdornment, CircularProgress } from "@mui/material";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { toast } from "react-toastify";
import candidateApi from "../../../../services/candidateApi";
import { palette } from "../../../../theme/candidateTokens";
import {
  SectionCard,
  DetailRow,
  FormDialog,
  dialogFieldSx,
  primaryBtnSx,
  unwrapData,
  apiErrorMessage,
  extractOptions,
  useDropdownLabels,
  labelForKey,
  keyForLabel,
  clean,
  orNull,
} from "../shared/profileSectionKit";

/* Fixed lists (no API for these). Typing your own value is also allowed. */
const JOB_TYPES = ["Permanent", "Contract", "Contract-to-Hire", "Temporary", "Freelance", "Internship"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time"];
const MAX_LOCATIONS = 5;

const EMPTY = {
  current_industry: "",
  department: "",
  role_category: "",
  job_role: "",
  desired_job_type: "",
  desired_employment_type: "",
  preferred_shift: "",
  preferred_work_locations: [],
  expected_salary: "",
};

/* The API may return [ {...} ], { data: [ {...} ] } or { ... } — take the first profile */
const firstProfile = (data) => {
  const p = Array.isArray(data) ? data[0] : Array.isArray(data?.career_profile) ? data.career_profile[0] : data;
  return p && typeof p === "object" ? p : null;
};

const toList = (v) =>
  Array.isArray(v) ? v.map(clean).filter(Boolean) : clean(v) ? clean(v).split(",").map((s) => s.trim()).filter(Boolean) : [];

const hasContent = (p) =>
  !!p && Object.keys(EMPTY).some((k) => (Array.isArray(p[k]) ? p[k].length > 0 : clean(p[k])));

const formatSalary = (v) => (Number(v) ? Number(v).toLocaleString("en-IN") : "");

/* Single-value dropdown that also accepts typed text */
const FreeSelect = ({ label, value, onChange, options, loading, onOpen, placeholder, disabled, helperText }) => (
  <Autocomplete
    freeSolo
    options={options}
    value={value}
    loading={loading}
    disabled={disabled}
    onOpen={onOpen}
    onChange={(_e, v) => onChange(v || "")}
    onInputChange={(_e, v, reason) => reason === "input" && onChange(v)}
    renderInput={(params) => (
      <TextField
        {...params}
        size="small"
        label={label}
        placeholder={placeholder}
        helperText={helperText}
        sx={dialogFieldSx}
        InputProps={{
          ...params.InputProps,
          endAdornment: (
            <>
              {loading ? <CircularProgress size={16} sx={{ color: palette.teal }} /> : null}
              {params.InputProps.endAdornment}
            </>
          ),
        }}
      />
    )}
  />
);

function CareerProfileSection({ onSectionComplete }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await candidateApi.get("/candidates/get-careerprofile");
      setProfile(firstProfile(unwrapData(res)));
    } catch (err) {
      if (err?.response?.status === 404) setProfile(null);
      else setLoadError(apiErrorMessage(err, "Failed to load career profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filled = hasContent(profile);
  useEffect(() => {
    if (!loading) onSectionComplete?.("careerProfile", filled);
  }, [loading, filled, onSectionComplete]);

  /* ── Dropdowns (loaded only once the dialog is open) ──────────────────── */
  const industries = useDropdownLabels("/candidate-preferred-job-categories", { enabled: open || filled });
  const shifts = useDropdownLabels("/candidate-preferred-work-shifts", { enabled: open || filled });

  // Departments keep their key, needed to load the role categories
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  useEffect(() => {
    if (!open || departments.length) return;
    setDepartmentsLoading(true);
    candidateApi
      .get("/functional-roles/functions")
      .then((res) => setDepartments(extractOptions(res)))
      .catch((err) => console.warn("Departments failed", err))
      .finally(() => setDepartmentsLoading(false));
  }, [open, departments.length]);

  const departmentKey = useMemo(
    () => departments.find((d) => d.label === form.department || d.key === form.department)?.key || "",
    [departments, form.department]
  );
  const roleCategories = useDropdownLabels(
    departmentKey ? `/functional-roles/sub-functions/${encodeURIComponent(departmentKey)}` : "",
    { enabled: open && !!departmentKey }
  );

  // Locations for the candidate's country (from Personal Details)
  const [country, setCountry] = useState("");
  useEffect(() => {
    if (!open || country) return;
    candidateApi
      .get("/candidates/get-personal-details")
      .then((res) => {
        const d = unwrapData(res);
        const p = Array.isArray(d) ? d[0] : d;
        setCountry(clean(p?.country));
      })
      .catch(() => {});
  }, [open, country]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  useEffect(() => {
    if (!open || !country) return;
    setLocationsLoading(true);
    candidateApi
      .get("/dropdown/locations", { params: { country } })
      .then((res) => setLocationOptions(extractOptions(res).map((o) => o.label)))
      .catch((err) => console.warn("Locations failed", err))
      .finally(() => setLocationsLoading(false));
  }, [open, country]);

  /* ── Editor ───────────────────────────────────────────────────────────── */
  const openEditor = () => {
    const p = profile || {};
    setForm({
      current_industry: labelForKey(industries.options, clean(p.current_industry)),
      department: clean(p.department),
      role_category: clean(p.role_category),
      job_role: clean(p.job_role),
      desired_job_type: clean(p.desired_job_type),
      desired_employment_type: clean(p.desired_employment_type),
      preferred_shift: labelForKey(shifts.options, clean(p.preferred_shift)),
      preferred_work_locations: toList(p.preferred_work_locations),
      expected_salary: p.expected_salary ? String(p.expected_salary) : "",
    });
    setErrors({});
    setOpen(true);
  };

  const set = (key) => (value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      // a new department means the old role category no longer fits
      ...(key === "department" && value !== prev.department ? { role_category: "" } : {}),
    }));
    setErrors((prev) => ({ ...prev, [key]: "", submit: "" }));
  };

  const validate = () => {
    const e = {};
    if (!clean(form.job_role) && !clean(form.department) && !clean(form.current_industry)) {
      e.job_role = "Add at least your industry, department or job role";
    }
    if (form.expected_salary && !/^\d{1,10}$/.test(form.expected_salary)) {
      e.expected_salary = "Enter a whole number";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const body = {
      current_industry: orNull(keyForLabel(industries.options, clean(form.current_industry))),
      department: orNull(form.department),
      role_category: orNull(form.role_category),
      job_role: orNull(form.job_role),
      desired_job_type: orNull(form.desired_job_type),
      desired_employment_type: orNull(form.desired_employment_type),
      preferred_shift: orNull(keyForLabel(shifts.options, clean(form.preferred_shift))),
      preferred_work_locations: form.preferred_work_locations.length ? form.preferred_work_locations : null,
      expected_salary: form.expected_salary ? Number(form.expected_salary) : null,
    };
    setSaving(true);
    try {
      const res = profile?.id
        ? await candidateApi.put(`/candidates/update-careerprofile/${profile.id}`, { id: String(profile.id), ...body })
        : await candidateApi.post("/candidates/add-careerprofile", [body]);
      if (res?.data?.success === false) throw new Error(res.data.message || "Couldn't save your career profile.");
      toast.success("Career profile saved");
      setOpen(false);
      await load();
    } catch (err) {
      setErrors({ submit: apiErrorMessage(err, "Couldn't save your career profile. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  const icon = (Icon) => <Icon sx={{ fontSize: 18 }} />;

  return (
    <SectionCard
      icon={RocketLaunchOutlinedIcon}
      title="Career Profile"
      action={
        !loading ? (
          <Button variant="contained" size="small" onClick={openEditor} sx={primaryBtnSx}>
            {filled ? "Edit Career Profile" : "+ Add Career Profile"}
          </Button>
        ) : null
      }
    >
      <Typography sx={{ fontSize: 12.5, color: palette.muted, mt: 1 }}>
        The kind of role you're looking for next — helps us match you to better jobs.
      </Typography>

      {loading && <Typography sx={{ color: palette.muted, fontSize: 13.5, mt: 2 }}>Loading...</Typography>}
      {loadError && <Typography sx={{ color: palette.coral, fontSize: 13.5, mt: 2 }}>{loadError}</Typography>}

      {!loading && !loadError && !filled && (
        <Box
          component="button"
          type="button"
          onClick={openEditor}
          sx={{
            all: "unset",
            boxSizing: "border-box",
            mt: 2,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            py: 2.5,
            border: `1.5px dashed ${palette.line}`,
            borderRadius: "10px",
            color: palette.teal,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
            "&:hover": { borderColor: palette.teal, bgcolor: palette.tealSoft },
          }}
        >
          <AddRoundedIcon sx={{ fontSize: 18 }} /> Tell us what you're looking for
        </Box>
      )}

      {!loading && filled && (
        <Grid container columnSpacing={4} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <DetailRow icon={icon(FactoryOutlinedIcon)} label="Current Industry" value={labelForKey(industries.options, profile.current_industry)} />
            <DetailRow icon={icon(AccountTreeOutlinedIcon)} label="Department" value={profile.department} />
            <DetailRow icon={icon(CategoryOutlinedIcon)} label="Role Category" value={profile.role_category} />
            <DetailRow icon={icon(BadgeOutlinedIcon)} label="Job Role" value={profile.job_role} />
            <DetailRow icon={icon(PaymentsOutlinedIcon)} label="Expected Salary" value={formatSalary(profile.expected_salary)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <DetailRow icon={icon(WorkOutlineOutlinedIcon)} label="Job Type" value={profile.desired_job_type} />
            <DetailRow icon={icon(ScheduleOutlinedIcon)} label="Employment Type" value={profile.desired_employment_type} />
            <DetailRow icon={icon(AccessTimeOutlinedIcon)} label="Preferred Shift" value={labelForKey(shifts.options, profile.preferred_shift)} />
            <DetailRow
              icon={icon(PlaceOutlinedIcon)}
              label="Work Locations"
              value={toList(profile.preferred_work_locations).join(", ")}
            />
          </Grid>
        </Grid>
      )}

      <FormDialog
        open={open}
        title={filled ? "Edit Career Profile" : "Add Career Profile"}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        saving={saving}
        error={errors.submit}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12 }}>
            <FreeSelect label="Current Industry" value={form.current_industry} onChange={set("current_industry")} options={industries.labels} loading={industries.loading} placeholder="e.g. Clinical Research" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FreeSelect label="Department" value={form.department} onChange={set("department")} options={departments.map((d) => d.label)} loading={departmentsLoading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FreeSelect
              label="Role Category"
              value={form.role_category}
              onChange={set("role_category")}
              options={roleCategories.labels}
              loading={roleCategories.loading}
              helperText={!form.department ? "Choose a department first to see options" : ""}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Job Role"
              placeholder="e.g. Clinical Data Manager"
              value={form.job_role}
              onChange={(e) => set("job_role")(e.target.value)}
              error={!!errors.job_role}
              helperText={errors.job_role}
              inputProps={{ maxLength: 100 }}
              sx={dialogFieldSx}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FreeSelect label="Job Type" value={form.desired_job_type} onChange={set("desired_job_type")} options={JOB_TYPES} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FreeSelect label="Employment Type" value={form.desired_employment_type} onChange={set("desired_employment_type")} options={EMPLOYMENT_TYPES} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FreeSelect label="Preferred Shift" value={form.preferred_shift} onChange={set("preferred_shift")} options={shifts.labels} loading={shifts.loading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Expected Salary (per year)"
              value={form.expected_salary}
              onChange={(e) => set("expected_salary")(e.target.value.replace(/[^\d]/g, ""))}
              error={!!errors.expected_salary}
              helperText={errors.expected_salary}
              inputProps={{ inputMode: "numeric", maxLength: 10 }}
              InputProps={{
                endAdornment: form.expected_salary ? (
                  <InputAdornment position="end">
                    <Typography sx={{ fontSize: 12, color: palette.muted }}>{formatSalary(form.expected_salary)}</Typography>
                  </InputAdornment>
                ) : null,
              }}
              sx={dialogFieldSx}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              multiple
              freeSolo
              options={locationOptions}
              loading={locationsLoading}
              value={form.preferred_work_locations}
              onChange={(_e, v) => set("preferred_work_locations")(v.map(clean).filter(Boolean).slice(0, MAX_LOCATIONS))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key ?? index}
                      {...tagProps}
                      size="small"
                      label={option}
                      sx={{ bgcolor: palette.tealSoft, color: palette.teal, fontWeight: 600, "& .MuiChip-deleteIcon": { color: palette.teal } }}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Preferred Work Locations"
                  placeholder={form.preferred_work_locations.length ? "" : "Pick or type a city, press Enter"}
                  helperText={`Up to ${MAX_LOCATIONS} locations${country ? ` · suggestions for ${country}` : ""}`}
                  sx={dialogFieldSx}
                />
              )}
            />
          </Grid>
        </Grid>
      </FormDialog>
    </SectionCard>
  );
}

export default React.memo(CareerProfileSection);