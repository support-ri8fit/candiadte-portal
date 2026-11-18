// src/pages/Candidate/dashboard/Personaldetails/EmergencyContact.jsx
//
// Emergency contact block shown inside the Personal Details card.
//   GET /candidates/get-emergency-contact
//   PUT /candidates/update-emergency-contact   { contact_name, relationship_to_candidate, phone_number }
//
// Phone has a country picker with flags: India (+91), United States (+1) or
// Other (type any code, e.g. +44). Saved as one string: "+91 9876543210",
// "+1 555-555-1234", "+44 7911123456".
import React, { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button, Grid, TextField, Autocomplete, MenuItem, Select } from "@mui/material";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import ContactPhoneOutlinedIcon from "@mui/icons-material/ContactPhoneOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { toast } from "react-toastify";
import candidateApi from "../../../../services/candidateApi";
import { palette, fonts } from "../../../../theme/candidateTokens";
import {
  DetailRow,
  FormDialog,
  dialogFieldSx,
  unwrapData,
  apiErrorMessage,
  clean,
  orNull,
} from "../shared/profileSectionKit";

/* ── Flags (SVG — Windows doesn't draw emoji flags) ─────────────────────── */
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

const OtherFlag = ({ size = 20 }) => (
  <Box
    component="span"
    sx={{ width: size, height: Math.round(size * 0.7), display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
  >
    <PublicOutlinedIcon sx={{ fontSize: size * 0.85, color: palette.muted }} />
  </Box>
);

/* ── Phone rules per country ────────────────────────────────────────────── */
const PHONE_COUNTRIES = {
  IN: {
    label: "India",
    code: "+91",
    Flag: IndiaFlag,
    placeholder: "98765 43210",
    help: "10-digit mobile number",
    format: (d) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5, 10)}` : d),
    maxDigits: 10,
    valid: (d) => /^[6-9]\d{9}$/.test(d),
    error: "Enter a 10-digit Indian mobile number (starts with 6–9)",
  },
  US: {
    label: "United States",
    code: "+1",
    Flag: USFlag,
    placeholder: "555-555-1234",
    help: "10-digit US number",
    format: (d) =>
      d.length > 6 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d,
    maxDigits: 10,
    valid: (d) => /^[2-9]\d{9}$/.test(d),
    error: "Enter a 10-digit US number, e.g. 555-555-1234",
  },
  OTHER: {
    label: "Other country",
    code: "",
    Flag: OtherFlag,
    placeholder: "Phone number",
    help: "Number without the country code",
    format: (d) => d,
    maxDigits: 14,
    valid: (d) => d.length >= 6 && d.length <= 14,
    error: "Enter a valid phone number (6–14 digits)",
  },
};
const COUNTRY_KEYS = ["IN", "US", "OTHER"];
const digitsOnly = (v) => String(v || "").replace(/\D/g, "");

/* Saved "+91 9876543210" → { country: "IN", code: "+91", number: "98765 43210" } */
const parsePhone = (saved) => {
  const raw = clean(saved);
  if (!raw) return { country: "IN", code: "+91", number: "" };
  // India / US first, so "+919876543210" (no space) isn't read as code +9198
  if (/^\+91/.test(raw)) return { country: "IN", code: "+91", number: PHONE_COUNTRIES.IN.format(digitsOnly(raw.slice(3))) };
  if (/^\+1(?!\d{11})/.test(raw)) return { country: "US", code: "+1", number: PHONE_COUNTRIES.US.format(digitsOnly(raw.slice(2))) };
  const m = raw.match(/^\+(\d{1,4})[\s-]+(.*)$/) || raw.match(/^\+(\d{1,3})(.*)$/);
  if (!m) {
    // No code saved → old value; 10 digits is treated as India
    const d = digitsOnly(raw);
    return { country: "IN", code: "+91", number: PHONE_COUNTRIES.IN.format(d.slice(-10)) };
  }
  const [, code, rest] = m;
  if (code === "91") return { country: "IN", code: "+91", number: PHONE_COUNTRIES.IN.format(digitsOnly(rest)) };
  if (code === "1") return { country: "US", code: "+1", number: PHONE_COUNTRIES.US.format(digitsOnly(rest)) };
  return { country: "OTHER", code: `+${code}`, number: digitsOnly(rest) };
};

/* What we save: code + space + number (US keeps its dashes) */
const buildPhone = (country, code, number) => {
  const d = digitsOnly(number);
  if (country === "US") return `+1 ${PHONE_COUNTRIES.US.format(d)}`;
  if (country === "IN") return `+91 ${d}`;
  return `+${digitsOnly(code)} ${d}`;
};

/* Flag + number for the read-only row */
const PhoneValue = ({ value }) => {
  if (!clean(value)) return "—";
  const p = parsePhone(value);
  const { Flag } = PHONE_COUNTRIES[p.country];
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
      <Flag size={18} />
      <span>{`${p.code} ${p.number}`}</span>
    </Box>
  );
};

const RELATIONSHIPS = ["Father", "Mother", "Spouse", "Brother", "Sister", "Son", "Daughter", "Friend", "Guardian", "Other"];

function EmergencyContact() {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contact_name: "",
    relationship_to_candidate: "",
    phone_country: "IN",
    phone_code: "+91",
    phone_number: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await candidateApi.get("/candidates/get-emergency-contact");
      const d = unwrapData(res);
      setContact(Array.isArray(d) ? d[0] || null : d);
    } catch (err) {
      if (err?.response?.status !== 404) console.error("Emergency contact failed", err);
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filled = !!(contact && (clean(contact.contact_name) || clean(contact.phone_number)));

  const openEditor = () => {
    const phone = parsePhone(contact?.phone_number);
    setForm({
      contact_name: clean(contact?.contact_name),
      relationship_to_candidate: clean(contact?.relationship_to_candidate),
      phone_country: phone.country,
      phone_code: phone.code,
      phone_number: phone.number,
    });
    setErrors({});
    setOpen(true);
  };

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "", submit: "" }));
  };

  const rules = PHONE_COUNTRIES[form.phone_country];

  // Switching country clears the number (formats differ)
  const handleCountryChange = (key) => {
    setForm((prev) => ({
      ...prev,
      phone_country: key,
      phone_code: PHONE_COUNTRIES[key].code,
      phone_number: "",
    }));
    setErrors((prev) => ({ ...prev, phone_number: "", phone_code: "", submit: "" }));
  };

  // Only digits are kept; India / US are formatted while typing
  const handleNumberChange = (value) => {
    const d = digitsOnly(value).slice(0, rules.maxDigits);
    set("phone_number")(rules.format(d));
  };

  const handleCodeChange = (value) => {
    const d = digitsOnly(value).slice(0, 4);
    set("phone_code")(d ? `+${d}` : "");
  };

  const validate = () => {
    const e = {};
    const d = digitsOnly(form.phone_number);
    if (!clean(form.contact_name)) e.contact_name = "Name is required";
    if (form.phone_country === "OTHER") {
      const code = digitsOnly(form.phone_code);
      if (!code) e.phone_code = "Code required";
      else if (code === "91" || code === "1") e.phone_code = "Pick India / US above";
    }
    if (!d) e.phone_number = "Phone number is required";
    else if (!rules.valid(d)) e.phone_number = rules.error;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await candidateApi.put("/candidates/update-emergency-contact", {
        contact_name: orNull(form.contact_name),
        relationship_to_candidate: orNull(form.relationship_to_candidate),
        phone_number: buildPhone(form.phone_country, form.phone_code, form.phone_number),
      });
      if (res?.data?.success === false) throw new Error(res.data.message || "Couldn't save the emergency contact.");
      toast.success("Emergency contact saved");
      setOpen(false);
      await load();
    } catch (err) {
      setErrors({ submit: apiErrorMessage(err, "Couldn't save the emergency contact. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Heading row — same style as the other Personal Details groups */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ContactPhoneOutlinedIcon sx={{ fontSize: 17, color: palette.teal }} />
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 14, color: palette.ink }}>
            Emergency Contact
          </Typography>
        </Box>
        {!loading && (
          <Button
            size="small"
            onClick={openEditor}
            sx={{ textTransform: "none", fontWeight: 600, color: palette.teal, minWidth: 0, "&:hover": { bgcolor: palette.tealSoft } }}
          >
            {filled ? "Edit" : "+ Add"}
          </Button>
        )}
      </Box>

      {loading && <Typography sx={{ color: palette.muted, fontSize: 13 }}>Loading...</Typography>}
      {!loading && !filled && (
        <Typography sx={{ color: palette.muted, fontSize: 13 }}>
          Someone we can reach if we can't contact you.
        </Typography>
      )}
      {!loading && filled && (
        <Grid container columnSpacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <DetailRow icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} />} label="Name" value={contact.contact_name} />
            <DetailRow icon={<HandshakeOutlinedIcon sx={{ fontSize: 18 }} />} label="Relationship" value={contact.relationship_to_candidate} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <DetailRow icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />} label="Phone" value={<PhoneValue value={contact.phone_number} />} />
          </Grid>
        </Grid>
      )}

      <FormDialog
        open={open}
        title={filled ? "Edit Emergency Contact" : "Add Emergency Contact"}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        saving={saving}
        error={errors.submit}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Contact Name"
              required
              value={form.contact_name}
              onChange={(e) => set("contact_name")(e.target.value)}
              error={!!errors.contact_name}
              helperText={errors.contact_name}
              inputProps={{ maxLength: 100 }}
              sx={dialogFieldSx}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              freeSolo
              options={RELATIONSHIPS}
              value={form.relationship_to_candidate}
              onChange={(_e, v) => set("relationship_to_candidate")(v || "")}
              onInputChange={(_e, v, reason) => reason === "input" && set("relationship_to_candidate")(v)}
              renderInput={(params) => <TextField {...params} size="small" label="Relationship" placeholder="e.g. Father" sx={dialogFieldSx} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Select
              fullWidth
              size="small"
              value={form.phone_country}
              onChange={(e) => handleCountryChange(e.target.value)}
              inputProps={{ "aria-label": "Phone country" }}
              renderValue={(key) => {
                const c = PHONE_COUNTRIES[key];
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <c.Flag size={20} />
                    <span>{c.code ? `${c.label} (${c.code})` : c.label}</span>
                  </Box>
                );
              }}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": { borderColor: palette.line },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: palette.teal },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: palette.teal },
              }}
            >
              {COUNTRY_KEYS.map((key) => {
                const c = PHONE_COUNTRIES[key];
                return (
                  <MenuItem key={key} value={key} sx={{ gap: 1.25, "&.Mui-selected": { bgcolor: palette.tealSoft } }}>
                    <c.Flag size={22} />
                    <Box component="span" sx={{ flex: 1 }}>{c.label}</Box>
                    {c.code && <Box component="span" sx={{ color: palette.muted, fontSize: 13 }}>{c.code}</Box>}
                  </MenuItem>
                );
              })}
            </Select>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              {/* Country code: fixed for India / US, typed for Other */}
              <TextField
                size="small"
                label="Code"
                value={form.phone_code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={form.phone_country !== "OTHER"}
                placeholder="+44"
                error={!!errors.phone_code}
                helperText={errors.phone_code}
                inputProps={{ inputMode: "tel", maxLength: 5 }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ display: "flex", mr: 0.75 }}>
                      <rules.Flag size={18} />
                    </Box>
                  ),
                }}
                sx={{ ...dialogFieldSx, width: 120, flexShrink: 0, "& .Mui-disabled": { WebkitTextFillColor: palette.ink } }}
              />
              <TextField
                fullWidth
                size="small"
                label="Phone Number"
                required
                type="tel"
                placeholder={rules.placeholder}
                value={form.phone_number}
                onChange={(e) => handleNumberChange(e.target.value)}
                error={!!errors.phone_number}
                helperText={errors.phone_number || rules.help}
                inputProps={{ inputMode: "tel", maxLength: 20 }}
                sx={dialogFieldSx}
              />
            </Box>
          </Grid>
        </Grid>
      </FormDialog>
    </Box>
  );
}

export default React.memo(EmergencyContact);