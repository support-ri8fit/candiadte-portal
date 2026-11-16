// src/pages/Candidate/dashboard/References/ReferencesSection.jsx
//
// Professional references — up to 2.
//   GET /candidates/get-references
//   PUT /candidates/update-reference   { reference_number: 1 | 2, reference_name, relationship_to_candidate,
//                                        company_name, phone_number, email }   (adds or updates)
import React, { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button, IconButton, Grid, TextField, Autocomplete, Tooltip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { toast } from "react-toastify";
import candidateApi from "../../../../services/candidateApi";
import { palette } from "../../../../theme/candidateTokens";
import {
  SectionCard,
  DetailRow,
  FormDialog,
  dialogFieldSx,
  unwrapData,
  apiErrorMessage,
  isValidEmail,
  isValidPhone,
  clean,
  orNull,
} from "../shared/profileSectionKit";

const MAX_REFERENCES = 2;
const RELATIONSHIPS = ["Manager", "Team Lead", "Colleague", "Client", "Mentor", "Professor", "HR", "Other"];
const EMPTY = { reference_name: "", relationship_to_candidate: "", company_name: "", phone_number: "", email: "" };

/* The API may return [..], { references: [..] } or { reference_1: {..}, reference_2: {..} } */
const toReferenceList = (data) => {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.references)
    ? data.references
    : data && typeof data === "object"
    ? [data.reference_1, data.reference_2].filter(Boolean)
    : [];
  const byNumber = {};
  list.forEach((r, i) => {
    const n = Number(r?.reference_number) || i + 1;
    if (n >= 1 && n <= MAX_REFERENCES) byNumber[n] = r;
  });
  return byNumber; // { 1: {...}, 2: {...} }
};

const hasContent = (r) => !!(r && (clean(r.reference_name) || clean(r.phone_number) || clean(r.email)));

function ReferencesSection({ onSectionComplete }) {
  const [references, setReferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editing, setEditing] = useState(null); // reference_number being edited
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await candidateApi.get("/candidates/get-references");
      setReferences(toReferenceList(unwrapData(res)));
    } catch (err) {
      // 404 = nothing saved yet
      if (err?.response?.status === 404) setReferences({});
      else setLoadError(apiErrorMessage(err, "Failed to load references."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filled = [1, 2].filter((n) => hasContent(references[n]));
  useEffect(() => {
    if (!loading) onSectionComplete?.("references", filled.length > 0);
  }, [loading, filled.length, onSectionComplete]);

  const openEditor = (number) => {
    const r = references[number] || {};
    setForm({
      reference_name: clean(r.reference_name),
      relationship_to_candidate: clean(r.relationship_to_candidate),
      company_name: clean(r.company_name),
      phone_number: clean(r.phone_number),
      email: clean(r.email),
    });
    setErrors({});
    setEditing(number);
  };

  const setField = (key) => (e, value) => {
    const v = value !== undefined && typeof value === "string" ? value : e?.target?.value ?? "";
    setForm((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: "", submit: "" }));
  };

  const validate = () => {
    const e = {};
    if (!clean(form.reference_name)) e.reference_name = "Name is required";
    if (!clean(form.phone_number) && !clean(form.email)) {
      e.phone_number = "Add a phone number or an email";
      e.email = "Add a phone number or an email";
    }
    if (clean(form.phone_number) && !isValidPhone(form.phone_number)) e.phone_number = "Enter a valid phone number";
    if (clean(form.email) && !isValidEmail(form.email)) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await candidateApi.put("/candidates/update-reference", {
        reference_number: editing,
        reference_name: orNull(form.reference_name),
        relationship_to_candidate: orNull(form.relationship_to_candidate),
        company_name: orNull(form.company_name),
        phone_number: orNull(form.phone_number),
        email: orNull(form.email),
      });
      if (res?.data?.success === false) throw new Error(res.data.message || "Couldn't save the reference.");
      toast.success(`Reference ${editing} saved`);
      setEditing(null);
      await load();
    } catch (err) {
      setErrors({ submit: apiErrorMessage(err, "Couldn't save the reference. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  const nextEmpty = [1, 2].find((n) => !hasContent(references[n]));

  return (
    <SectionCard
      icon={PeopleAltOutlinedIcon}
      title="References"
      action={
        nextEmpty && !loading ? (
          <Button variant="contained" size="small" onClick={() => openEditor(nextEmpty)} sx={{ bgcolor: palette.teal, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: palette.tealDeep } }}>
            + Add Reference
          </Button>
        ) : null
      }
    >
      <Typography sx={{ fontSize: 12.5, color: palette.muted, mt: 1 }}>
        People who can speak about your work. You can add up to {MAX_REFERENCES}.
      </Typography>

      {loading && <Typography sx={{ color: palette.muted, fontSize: 13.5, mt: 2 }}>Loading...</Typography>}
      {loadError && <Typography sx={{ color: palette.coral, fontSize: 13.5, mt: 2 }}>{loadError}</Typography>}

      {!loading && !loadError && filled.length === 0 && (
        <Box
          component="button"
          type="button"
          onClick={() => openEditor(1)}
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
          <AddRoundedIcon sx={{ fontSize: 18 }} /> Add your first reference
        </Box>
      )}

      {!loading &&
        filled.map((n) => {
          const r = references[n];
          return (
            <Box
              key={n}
              sx={{
                mt: 2,
                p: 2.25,
                position: "relative",
                border: `1px solid ${palette.line}`,
                borderRadius: "10px",
                "&:hover": { borderColor: palette.teal },
              }}
            >
              <Tooltip title="Edit reference" arrow>
                <IconButton
                  size="small"
                  onClick={() => openEditor(n)}
                  aria-label={`Edit reference ${n}`}
                  sx={{ position: "absolute", top: 10, right: 10, color: palette.teal }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: palette.teal, textTransform: "uppercase" }}>
                Reference {n}
              </Typography>
              <Typography sx={{ fontSize: { xs: 13.5, sm: 15 }, fontWeight: 600, color: palette.ink, pr: 5, overflowWrap: "anywhere" }}>
                {r.reference_name || "—"}
              </Typography>
              <DetailRow icon={<HandshakeOutlinedIcon sx={{ fontSize: 18 }} />} label="Relationship" value={r.relationship_to_candidate} />
              <DetailRow icon={<ApartmentOutlinedIcon sx={{ fontSize: 18 }} />} label="Company" value={r.company_name} />
              <DetailRow icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />} label="Phone" value={r.phone_number} />
              <DetailRow icon={<MailOutlineRoundedIcon sx={{ fontSize: 18 }} />} label="Email" value={r.email} />
            </Box>
          );
        })}

      <FormDialog
        open={editing !== null}
        title={hasContent(references[editing]) ? `Edit Reference ${editing}` : `Add Reference ${editing ?? ""}`}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        saving={saving}
        error={errors.submit}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Full Name" required value={form.reference_name} onChange={setField("reference_name")} error={!!errors.reference_name} helperText={errors.reference_name} inputProps={{ maxLength: 100 }} sx={dialogFieldSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              freeSolo
              options={RELATIONSHIPS}
              value={form.relationship_to_candidate}
              onChange={(e, v) => setField("relationship_to_candidate")(e, v || "")}
              onInputChange={(e, v, reason) => reason === "input" && setField("relationship_to_candidate")(e, v)}
              renderInput={(params) => <TextField {...params} size="small" label="Relationship" placeholder="e.g. Manager" sx={dialogFieldSx} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Company" value={form.company_name} onChange={setField("company_name")} inputProps={{ maxLength: 100 }} sx={dialogFieldSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Phone Number" type="tel" value={form.phone_number} onChange={setField("phone_number")} error={!!errors.phone_number} helperText={errors.phone_number} inputProps={{ maxLength: 20, inputMode: "tel" }} sx={dialogFieldSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email} onChange={setField("email")} error={!!errors.email} helperText={errors.email} inputProps={{ maxLength: 120, inputMode: "email" }} sx={dialogFieldSx} />
          </Grid>
        </Grid>
        <Typography sx={{ fontSize: 12, color: palette.muted, mt: 1.5 }}>
          Add at least a phone number or an email so the reference can be contacted.
        </Typography>
      </FormDialog>
    </SectionCard>
  );
}

export default React.memo(ReferencesSection);