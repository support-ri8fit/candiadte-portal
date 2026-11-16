// src/pages/Candidate/dashboard/Personaldetails/EmergencyContact.jsx
//
// Emergency contact block shown inside the Personal Details card.
//   GET /candidates/get-emergency-contact
//   PUT /candidates/update-emergency-contact   { contact_name, relationship_to_candidate, phone_number }
import React, { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button, Grid, TextField, Autocomplete } from "@mui/material";
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
  isValidPhone,
  clean,
  orNull,
} from "../shared/profileSectionKit";

const RELATIONSHIPS = ["Father", "Mother", "Spouse", "Brother", "Sister", "Son", "Daughter", "Friend", "Guardian", "Other"];

function EmergencyContact() {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contact_name: "", relationship_to_candidate: "", phone_number: "" });
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
    setForm({
      contact_name: clean(contact?.contact_name),
      relationship_to_candidate: clean(contact?.relationship_to_candidate),
      phone_number: clean(contact?.phone_number),
    });
    setErrors({});
    setOpen(true);
  };

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "", submit: "" }));
  };

  const validate = () => {
    const e = {};
    if (!clean(form.contact_name)) e.contact_name = "Name is required";
    if (!clean(form.phone_number)) e.phone_number = "Phone number is required";
    else if (!isValidPhone(form.phone_number)) e.phone_number = "Enter a valid phone number";
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
        phone_number: orNull(form.phone_number),
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
            <DetailRow icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />} label="Phone" value={contact.phone_number} />
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
            <TextField
              fullWidth
              size="small"
              label="Phone Number"
              required
              type="tel"
              value={form.phone_number}
              onChange={(e) => set("phone_number")(e.target.value)}
              error={!!errors.phone_number}
              helperText={errors.phone_number}
              inputProps={{ maxLength: 20, inputMode: "tel" }}
              sx={dialogFieldSx}
            />
          </Grid>
        </Grid>
      </FormDialog>
    </Box>
  );
}

export default React.memo(EmergencyContact);