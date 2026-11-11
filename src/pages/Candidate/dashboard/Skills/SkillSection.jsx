import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Chip,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { AppContext } from "../../../../AppContext";
import candidateApi from "../../../../services/candidateApi";
import {
  useGetCandidateKeySkillsQuery,
} from "../../../../store/api/settings/CandidatePortalApis";
import { palette, fonts } from "../../../../theme/candidateTokens";

const ACCENT = "#2B6F71";
const ACCENT_HOVER = "#1F5557";

/* Skills shown before "Show all" — fewer on phones so the card stays short */
const VISIBLE_SKILLS_DESKTOP = 12;
const VISIBLE_SKILLS_PHONE = 8;

/* Device helpers — finger input gets bigger targets / 16px inputs (no iOS zoom) */
const TOUCH = "@media (pointer: coarse)";
const HOVER = "@media (hover: hover)";

const dialogFieldSx = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: palette.line },
    "&:hover fieldset": { borderColor: palette.teal },
    "&.Mui-focused fieldset": { borderColor: palette.teal },
    [TOUCH]: { fontSize: 16 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: palette.teal },
};

/* Same small heading used in the Personal Details dialog */
const GroupHeading = ({ icon: Icon, title }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
    <Icon sx={{ fontSize: 17, color: palette.teal }} />
    <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 14, color: palette.ink }}>
      {title}
    </Typography>
  </Box>
);

function SkillsSection({ keySkillInfo, completeDetailsApi, onSectionComplete }) {
  const { formData = {}, setFormData } = useContext(AppContext);
  const [skills, setSkills] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentSkill, setCurrentSkill] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editIndex, setEditIndex] = useState(null); // null = adding, number = editing that skill
  const [showAllSkills, setShowAllSkills] = useState(false);

  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const VISIBLE_SKILLS = isPhone ? VISIBLE_SKILLS_PHONE : VISIBLE_SKILLS_DESKTOP;

  const {
    data: keySkillsResponse,
    isLoading,
    refetch,
  } = useGetCandidateKeySkillsQuery();
  // Candidate id for the skill APIs. Falls back to other id fields the
  // key-skills response may use, so the URL never ends in "/undefined".
  const skillId =
    keySkillsResponse?.data?.candidate_id ??
    keySkillsResponse?.data?.skill_info?.candidate_id ??
    keySkillsResponse?.data?.id;

  // Summary / availability / TA experience must be re-sent with every
  // update-skill-info call (it replaces the whole record) — use the CURRENT
  // values so editing a skill never wipes the summary.
  const pickInfo = (src) =>
    Array.isArray(src?.skill_info) ? src.skill_info[0] : src?.skill_info;
  const skillInfo = {
    ...(keySkillsResponse?.data || {}),
    ...(pickInfo(keySkillsResponse?.data) || {}),
    ...(pickInfo(keySkillInfo) || {}),
  };

  /* The API may answer HTTP 200 with { success: false, status: 404, message }.
     Treat that as a failure too. */
  const failureMessage = (res) =>
    res?.data?.success === false || (res?.data?.status && res.data.status >= 400)
      ? res.data.message || "Something went wrong. Please try again."
      : null;
  const errorMessage = (err, fallback) =>
    err?.response?.data?.detail?.[0]?.msg ||
    (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
    err?.response?.data?.message ||
    fallback;


  // Initialize skills from keySkillInfo or formData.itSkills
  useEffect(() => {
    if (!keySkillsResponse?.data) return;

    const initialSkills =
      keySkillsResponse.data.key_skills
        ?.split(",")
        .map((skill) => skill.trim()) || [];

    setSkills(initialSkills);

    setFormData((prev) => ({
      ...prev,
      itSkills: initialSkills,
    }));
  }, [keySkillsResponse, setFormData]);

  // Tell the Profile Completion sidebar whether there are skills
  useEffect(() => {
    if (keySkillsResponse === undefined) return; // still loading
    onSectionComplete?.("skills", skills.length > 0);
  }, [skills.length, keySkillsResponse, onSectionComplete]);

  const handleAddClick = () => {
    setCurrentSkill("");
    setEditIndex(null);
    setOpenDialog(true);
    setError(null);
  };

  // Click a skill chip → edit that one skill
  const handleEditClick = (index) => {
    setCurrentSkill(skills[index]);
    setEditIndex(index);
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setOpenDialog(false);
    setCurrentSkill("");
    setEditIndex(null);
  };

  const handleDeleteClick = async (index) => {
    const skillToDelete = skills[index];
    try {
      const response = await candidateApi.delete(
        `/candidates/delete-skill/${skillId}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          data: new URLSearchParams({
            skill_to_delete: skillToDelete,
          }),
        }
      );

      if (response.status === 200) {
        const updatedSkills = skills.filter((_, i) => i !== index);
        setSkills(updatedSkills);
        setFormData((prev) => ({ ...prev, itSkills: updatedSkills }));
        refetch();
      }
    } catch (err) {
      setError("Failed to delete skill. Please try again.");
      console.error("Delete skill error:", err);
    }
  };

  const finishSave = (updatedSkills) => {
    setSkills(updatedSkills);
    setFormData((prev) => ({ ...prev, itSkills: updatedSkills }));
    refetch();
    completeDetailsApi?.(); // optional — the profile page doesn't pass it
    setOpenDialog(false);
    setCurrentSkill("");
    setEditIndex(null);
    setError(null);
  };

  /* ADD — POST /candidates/add-skill/{skill_id}
     All new skills go in ONE call: skill_to_add = "SAS, SDTM, Define.xml" */
  const addSkills = async () => {
    const existing = new Set(skills.map((skill) => skill.toLowerCase()));
    const newSkills = pendingSkills.filter((skill) => !existing.has(skill.toLowerCase()));
    if (newSkills.length === 0) {
      setError("These skills are already on your profile.");
      return;
    }

    setSaving(true);
    try {
      const res = await candidateApi.post(
        `/candidates/add-skill/${skillId}`,
        new URLSearchParams({ skill_to_add: newSkills.join(", ") }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      const failed = failureMessage(res);
      if (failed) {
        setError(failed);
        console.error("Add skill failed:", res.data, { skillId });
        return;
      }
      finishSave([...skills, ...newSkills]);
    } catch (err) {
      setError(errorMessage(err, "Couldn't add skills. Please try again."));
      console.error("Add skill error:", err?.response?.data || err, { skillId });
    } finally {
      setSaving(false);
    }
  };

  /* EDIT — PUT /candidates/update-skill-info/{skill_id}
     Sends the WHOLE list (with the edited skill replaced) as key_skills,
     plus the current summary / availability / TA experience. */
  const updateSkill = async () => {
    const edited = currentSkill.trim();
    if (edited === skills[editIndex]) {
      handleCloseDialog(); // nothing changed
      return;
    }
    const duplicate = skills.some(
      (skill, i) => i !== editIndex && skill.toLowerCase() === edited.toLowerCase()
    );
    if (duplicate) {
      setError(`"${edited}" is already on your profile.`);
      return;
    }
    if (edited.includes(",")) {
      setError("Edit one skill at a time (no commas). Use Add Skills to add more.");
      return;
    }

    const updatedSkills = skills.map((skill, i) => (i === editIndex ? edited : skill));
    setSaving(true);
    try {
      const res = await candidateApi.put(
        `/candidates/update-skill-info/${skillId}`,
        {
          summary: skillInfo?.summary || "",
          availability: skillInfo?.availability || 0,
          ta_experience_combined: skillInfo?.ta_experience_combined || "",
          key_skills: updatedSkills.join(", "),
        },
        { headers: { "Content-Type": "application/json" } }
      );
      const failed = failureMessage(res);
      if (failed) {
        setError(failed);
        console.error("Update skill failed:", res.data, { skillId });
        return;
      }
      finishSave(updatedSkills);
    } catch (err) {
      setError(errorMessage(err, "Couldn't update the skill. Please try again."));
      console.error("Update skill error:", err?.response?.data || err, { skillId });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (currentSkill.trim() === "") return;
    if (!skillId) {
      setError("Couldn't find your profile id. Please refresh the page and try again.");
      console.error("Save skill: no candidate id in key-skills response", keySkillsResponse);
      return;
    }
    return editIndex !== null ? updateSkill() : addSkills();
  };

  const handleInputChange = (e) => {
    setCurrentSkill(e.target.value);
    setError(null);
  };

  // Enter = save (Shift+Enter does nothing special)
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  // Skills typed so far in "Add" mode, shown as removable chips
  const pendingSkills = [
    ...new Set(
      currentSkill
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    ),
  ];

  const handleRemovePending = (skillToRemove) => {
    const remaining = pendingSkills.filter((skill) => skill !== skillToRemove);
    setCurrentSkill(remaining.length ? remaining.join(", ") + ", " : "");
  };

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: 2,
        p: { xs: 1.75, sm: 2, md: 2.5 },
        mb: 2,
        boxShadow: 1,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      {/* Header: title + count on the left, "+ Add" on the right — always one line */}
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <Box display="flex" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ fontSize: { xs: 16, sm: 18 }, whiteSpace: "nowrap" }}
          >
            Key Skills
          </Typography>
          {skills.length > 0 && (
            <Box
              component="span"
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: ACCENT,
                bgcolor: "#EAF5F4",
                borderRadius: "10px",
                px: 0.9,
                py: 0.1,
                flexShrink: 0,
              }}
            >
              {skills.length}
            </Box>
          )}
        </Box>
        <Button
          size="small"
          variant="contained"
          disableElevation
          startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
          onClick={handleAddClick}
          aria-label="Add skills"
          sx={{
            bgcolor: ACCENT,
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "8px",
            px: { xs: 1.25, sm: 1.75 },
            minHeight: 34,
            whiteSpace: "nowrap",
            flexShrink: 0,
            "& .MuiButton-startIcon": { mr: { xs: 0.5, sm: 0.75 } },
            "&:hover": { bgcolor: ACCENT },
            [HOVER]: { "&:hover": { bgcolor: ACCENT_HOVER } },
            [TOUCH]: { minHeight: 40 },
          }}
        >
          {/* Short label on phones so it never wraps to two lines */}
          {isPhone ? "Add" : "Add Skills"}
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      <Box mt={{ xs: 1.25, sm: 1.5, md: 2 }} display="flex" gap={{ xs: 0.75, sm: 1 }} flexWrap="wrap">
        {skills.length > 0 ? (
          (showAllSkills ? skills : skills.slice(0, VISIBLE_SKILLS)).map((skill, index) => (
            <Chip
              key={`${skill}-${index}`}
              onClick={() => handleEditClick(index)}
              label={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    component="span"
                    title={skill}
                    sx={{
                      fontSize: { xs: 12.5, sm: 13, md: 14 },
                      ml: 0.2,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {skill}
                  </Typography>

                  <DeleteOutlineIcon
                    role="button"
                    aria-label={`Remove ${skill}`}
                    onClick={(e) => {
                      e.stopPropagation(); // don't open edit
                      handleDeleteClick(index);
                    }}
                    sx={{
                      fontSize: 16,
                      flexShrink: 0,
                      color: "#EF4444",
                      cursor: "pointer",
                      opacity: 0,
                      transform: "scale(0.8)",
                      transition: "all .2s ease",
                      ".MuiChip-root:hover &": {
                        opacity: 1,
                        transform: "scale(1)",
                      },
                      "&:hover": {
                        color: "#DC2626",
                      },
                      // Delete shows on hover only — on touch screens (no hover) don't
                      // keep an empty gap for it inside the chip
                      "@media (hover: none)": { display: "none" },
                    }}
                  />
                </Box>
              }
              sx={{
                bgcolor: "#fff",
                border: "1px solid #D1D5DB",
                color: "#374151",
                height: { xs: 32, sm: 34 },
                maxWidth: "100%", // very long skill names end in "…" instead of overflowing
                cursor: "pointer",
                "& .MuiChip-label": { px: { xs: 1.25, sm: 1.5 }, minWidth: 0 },
                "&:hover": { bgcolor: "#fff" },
                [HOVER]: { "&:hover": { borderColor: ACCENT } },
              }}
            />
          ))
        ) : (
          <Typography sx={{ color: "text.secondary", fontSize: { xs: 13.5, sm: 14 } }}>
            No skills added yet. Use “Add” to add your key skills.
          </Typography>
        )}

        {/* "+N more" chip at the end of the visible list */}
        {!showAllSkills && skills.length > VISIBLE_SKILLS && (
          <Chip
            label={`+${skills.length - VISIBLE_SKILLS} more`}
            onClick={() => setShowAllSkills(true)}
            sx={{
              height: { xs: 32, sm: 34 },
              bgcolor: "#EAF5F4",
              color: ACCENT,
              fontWeight: 700,
              border: "1px solid transparent",
              "&:hover": { bgcolor: "#DCEFED", borderColor: ACCENT },
            }}
          />
        )}
      </Box>

      {/* Show all / Show less */}
      {skills.length > VISIBLE_SKILLS && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
          <Button
            size="small"
            onClick={() => setShowAllSkills((prev) => !prev)}
            endIcon={
              <KeyboardArrowDownRoundedIcon
                sx={{
                  transition: "transform .2s ease",
                  transform: showAllSkills ? "rotate(180deg)" : "none",
                }}
              />
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: ACCENT,
              borderRadius: "20px",
              px: 2,
              minHeight: 36,
              [HOVER]: { "&:hover": { bgcolor: "#EAF5F4" } },
              [TOUCH]: { minHeight: 44 },
            }}
          >
            {showAllSkills ? "Show less" : `Show all ${skills.length} skills`}
          </Button>
        </Box>
      )}

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "14px",
            m: { xs: 2, sm: 4 },
            width: { xs: "calc(100% - 32px)", sm: "100%" },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: fonts.display,
            fontWeight: 600,
            color: palette.ink,
            fontSize: { xs: 18, sm: 20 },
            pr: 6, // room for the close button
          }}
        >
          {editIndex !== null ? "Edit Skill" : "Add Skills"}
          <IconButton
            onClick={handleCloseDialog}
            sx={{ position: "absolute", right: 8, top: 8, color: palette.teal }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Typography sx={{ color: palette.coral, mb: 1.5, display: "block" }} variant="caption">
              {error}
            </Typography>
          )}

          <GroupHeading icon={PsychologyOutlinedIcon} title="Key Skills" />

          <TextField
            fullWidth
            size="small"
            label={editIndex !== null ? "Skill" : "Skills (comma-separated)"}
            placeholder={editIndex !== null ? "" : "e.g. SAS, SDTM, Define.xml"}
            value={currentSkill}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoFocus
            helperText={
              editIndex !== null
                ? "Press Enter to save."
                : "Separate skills with commas. Press Enter to add."
            }
            FormHelperTextProps={{ sx: { color: palette.muted, ml: 0 } }}
            sx={dialogFieldSx}
          />

          {/* Skills being added — click X to remove before saving */}
          {editIndex === null && pendingSkills.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
              {pendingSkills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  size="small"
                  onDelete={() => handleRemovePending(skill)}
                  sx={{
                    bgcolor: palette.tealSoft,
                    color: palette.teal,
                    fontWeight: 600,
                    fontSize: 12.5,
                    "& .MuiChip-deleteIcon": {
                      color: palette.teal,
                      "&:hover": { color: palette.tealDeep },
                    },
                  }}
                />
              ))}
            </Box>
          )}

        </DialogContent>

        {/* Phones: full-width buttons, main action on top */}
        <DialogActions
          sx={{
            p: 2,
            gap: 1,
            flexDirection: { xs: "column-reverse", sm: "row" },
            "& > :not(style) ~ :not(style)": { ml: { xs: 0, sm: 1 } },
            "& .MuiButton-root": {
              width: { xs: "100%", sm: "auto" },
              minHeight: 40,
              [TOUCH]: { minHeight: 44 },
            },
          }}
        >
          <Button
            onClick={handleCloseDialog}
            disabled={saving}
            variant="outlined"
            sx={{ borderColor: palette.line, color: palette.ink, textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || currentSkill.trim() === ""}
            sx={{
              bgcolor: palette.teal,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: palette.tealDeep },
            }}
          >
            {saving
              ? editIndex !== null ? "Updating…" : "Adding…"
              : editIndex !== null ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default React.memo(SkillsSection);