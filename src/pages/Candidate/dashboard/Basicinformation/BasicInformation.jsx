import React, { useState, useContext, useEffect, useRef, useLayoutEffect } from "react";
import Verified from "@mui/icons-material/Verified";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Divider,
  Paper,
  Tooltip,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { AppContext } from "../../../../AppContext";
import {
  useGetCandidateProfileImageQuery,
  useUploadCandidateProfileImageMutation,
  useUpdateCandidateProfileDetailsMutation,
  useGetCandidateSpecificDetailsQuery,
  useGetPersonalDetailsQuery,
  useUpdatePersonalDetailsMutation,
} from "../../../../store/api/settings/CandidatePortalApis";
import { GridCloseIcon } from "@mui/x-data-grid";
import { EmailOutlined } from "@mui/icons-material";
import { palette, fonts } from "../../../../theme/candidateTokens";

/* ── LinkedIn helpers ─────────────────────────────────────────────────────
   LinkedIn is saved with Personal Details (linkedin_url on
   PUT /candidates/update-personal-details). */
const normalizeLinkedIn = (v) => {
  const t = String(v || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, "")}`;
};
const isLinkedInUrl = (v) =>
  /^https?:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/(in|pub|company)\/[^\s/]+/i.test(normalizeLinkedIn(v));
/* "https://www.linkedin.com/in/arpit-c/" → "linkedin.com/in/arpit-c" */
const shortLinkedIn = (v) =>
  normalizeLinkedIn(v)
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/\/+$/, "");

/* Personal-details fields the update API accepts — sent back unchanged so
   saving the LinkedIn link never clears the rest of Personal Details. */
const PERSONAL_FIELDS = [
  "date_of_birth", "gender", "marital_status", "nationality", "languages_known", "address",
  "present_address", "preferred_salary", "work_authorizations", "city", "state", "country",
  "pincode", "willing_to_relocate", "linkedin_url", "preferred_contact_methods",
  "preferred_employment_types", "preferred_engagement_types", "preferred_work_arrangements",
  "current_us_work_authorizations", "important_w2_benefits", "most_important_opportunity_factors",
  "preferred_interview_days", "preferred_job_categories", "preferred_seniority_levels",
  "preferred_company_types", "location_preference", "employer_sponsorship",
  "authorization_expiration_date", "compensation_basis", "rate_dependent_on_benefits",
  "current_employment_status", "current_time_zone", "preferred_us_time_zone", "preferred_shift",
  "current_job_search_status", "preferred_interview_time", "interview_time_zone",
  "interview_preference", "referral_source", "referral_source_details",
];
const DATE_FIELDS = ["date_of_birth", "authorization_expiration_date"];

/* "+919398420112" → "+91 93984 20112" (leaves anything else as it is) */
const formatPhone = (p) => {
  const t = String(p || "").replace(/\s+/g, "");
  const m = t.match(/^\+91(\d{5})(\d{5})$/);
  if (m) return `+91 ${m[1]} ${m[2]}`;
  const us = t.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (us) return `+1 ${us[1]}-${us[2]}-${us[3]}`;
  return p || "";
};

/* One small stat tile: icon · label · value */
const StatTile = ({ icon, label, value }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      alignItems: { xs: "flex-start", sm: "center" },
      gap: { xs: 0.75, sm: 1.25 },
      p: { xs: 1.25, sm: 1.5 },
      borderRadius: "12px",
      border: `1px solid ${palette.line}`,
      bgcolor: "#FAFCFB",
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        width: { xs: 30, sm: 34 },
        height: { xs: 30, sm: 34 },
        borderRadius: "10px",
        bgcolor: palette.tealSoft,
        color: palette.teal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0, width: "100%" }}>
      <Typography
        sx={{
          fontSize: { xs: 10.5, sm: 11 },
          color: palette.muted,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 13.5, sm: 14.5 },
          fontWeight: 700,
          color: palette.ink,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={typeof value === "string" ? value : undefined}
      >
        {value || "—"}
      </Typography>
    </Box>
  </Box>
);

/* One contact line: icon · value · badge / action */
const ContactRow = ({ icon, children, href, verified, action }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, py: 0.5 }}>
    <Box sx={{ color: palette.teal, display: "flex", flexShrink: 0 }}>{icon}</Box>
    <Typography
      component={href ? "a" : "span"}
      href={href}
      target={href ? "_blank" : undefined}
      rel={href ? "noopener noreferrer" : undefined}
      sx={{
        fontSize: 13.5,
        color: href ? palette.teal : palette.ink,
        fontWeight: href ? 600 : 400,
        textDecoration: "none",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        "&:hover": href ? { textDecoration: "underline", textUnderlineOffset: "3px" } : {},
      }}
    >
      {children}
    </Typography>
    {verified && (
      <Tooltip title="Verified" arrow>
        <Verified sx={{ fontSize: 17, color: palette.teal, flexShrink: 0 }} />
      </Tooltip>
    )}
    {action}
  </Box>
);

/* Small underlined text button (Verify / + Add) */
const LinkAction = ({ children, onClick, color = palette.teal }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    sx={{
      border: "none",
      background: "none",
      p: 0,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13,
      fontWeight: 700,
      color,
      flexShrink: 0,
      textDecoration: "underline",
      textUnderlineOffset: "3px",
      "&:hover": { color: palette.tealDeep },
    }}
  >
    {children}
  </Box>
);

/* Same group heading as the Personal Details dialog */
const GroupHeading = ({ icon: Icon, title }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
    <Icon sx={{ fontSize: 17, color: palette.teal }} />
    <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 14, color: palette.ink }}>
      {title}
    </Typography>
  </Box>
);

/* ── About text: same number of lines on every screen ─────────────────────
   Clamps to ABOUT_LINES lines with CSS (not a character count), so a phone and a
   wide monitor both show 3 lines. "See more" only appears when the text really
   is cut off — checked again whenever the box is resized. */
const ABOUT_LINES = 3;

function AboutText({ text, onAdd }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => {
      if (expanded) return; // measure only while clamped
      setOverflowing(el.scrollHeight - el.clientHeight > 1);
    };
    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [text, expanded]);

  // Collapse again when the text changes (e.g. after editing)
  useEffect(() => setExpanded(false), [text]);

  if (!text?.trim()) {
    return (
      <Box
        sx={{
          border: `1px dashed ${palette.line}`,
          borderRadius: "10px",
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ fontSize: 13.5, color: palette.muted }}>
          Add a short summary of your experience and strengths.
        </Typography>
        <Box
          component="button"
          type="button"
          onClick={onAdd}
          sx={{
            border: "none",
            background: "none",
            p: 0,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13.5,
            fontWeight: 700,
            color: palette.teal,
            "&:hover": { textDecoration: "underline", textUnderlineOffset: "3px" },
          }}
        >
          + Add summary
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        ref={ref}
        sx={{
          fontSize: { xs: 13.5, sm: 14 },
          color: palette.ink,
          lineHeight: 1.7,
          whiteSpace: "pre-line", // keep the candidate's own line breaks
          overflowWrap: "anywhere",
          ...(expanded
            ? {}
            : {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: ABOUT_LINES,
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
          endIcon={
            <ExpandMoreRoundedIcon
              sx={{ transition: "transform .2s ease", transform: expanded ? "rotate(180deg)" : "none" }}
            />
          }
          aria-expanded={expanded}
          sx={{
            mt: 0.75,
            px: 0,
            minWidth: "unset",
            textTransform: "none",
            fontWeight: 700,
            fontSize: 13,
            color: palette.teal,
            "& .MuiButton-endIcon": { ml: 0.25 },
            "&:hover": { bgcolor: "transparent", textDecoration: "underline", textUnderlineOffset: "3px" },
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </Box>
  );
}

const dialogFieldSx = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: palette.line },
    "&:hover fieldset": { borderColor: palette.teal },
    "&.Mui-focused fieldset": { borderColor: palette.teal },
  },
};

function BasicInformation({ candidateInfo, completeDetailsApi }) {
  const { setFormData } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [updateCandidateProfileDetails] = useUpdateCandidateProfileDetailsMutation();
  const [uploadCandidateProfileImage] = useUploadCandidateProfileImageMutation();
  const candidate = candidateInfo || {};
  const { data: profileImageData, refetch: refetchProfileImage } = useGetCandidateProfileImageQuery(undefined, {
    skip: !candidate,
  });
  const [uploadError, setUploadError] = useState(null);
  const [viewError, setViewError] = useState(null);
  const {
    data: candidateDetails,
    isLoading,
    refetch,
  } = useGetCandidateSpecificDetailsQuery();

  // LinkedIn lives in Personal Details (same cache as the Personal Details card)
  const { data: personalDetailsData, refetch: refetchPersonalDetails } = useGetPersonalDetailsQuery();
  const [updatePersonalDetails] = useUpdatePersonalDetailsMutation();
  const personalSaved = (() => {
    const d = personalDetailsData?.data ?? personalDetailsData;
    return Array.isArray(d) ? d[0] || {} : d || {};
  })();
  const savedLinkedIn = personalSaved?.linkedin_url || "";
  const [linkedinDraft, setLinkedinDraft] = useState("");
  const [linkedinError, setLinkedinError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const openEditor = () => {
    setLinkedinDraft(savedLinkedIn);
    setLinkedinError("");
    setSaveError("");
    setOpen(true);
  };

  const getEmployment =
    candidate?.employment?.find((emp) => emp.is_current) ||
    candidate?.employment?.[0] ||
    {};
  const personal = candidate?.personal_details || {};
  const [basicInfo, setBasicInfo] = useState({
    full_name: candidateInfo?.full_name || "",
    employment_id: getEmployment?.id || "",
    notice_period_days: getEmployment?.notice_period_days || 0,
    company_name: getEmployment?.company_name || "",
    designation: getEmployment?.job_title || "",
    city: personal?.city || "",
    country: personal?.country || "",
    // qualification: getQualification,
    summary:
      candidate?.skill_info?.[0]?.summary || candidate?.profile_summary || "",
    email: candidateDetails?.data?.email_id || "",
    mobile: candidate?.phone_number || "",
    profile_picture: candidate?.profile_image_url || "",
    current_salary: getEmployment?.current_salary || "",
  });

  const lastUpdatedDate = candidate?.updated_at
    ? new Date(candidate.updated_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // const fetchProfileImage = async () => {
  //   try {
  //     if (profileImageData?.success) {
  //       setBasicInfo((prev) => ({
  //         ...prev,
  //         profile_picture: profileImageData.profile_image_url || "",
  //       }));
  //       setViewError(null);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching profile image:", error);
  //     setViewError("Failed to load profile image.");
  //   }
  // };
  useEffect(() => {
    if (profileImageData?.success && profileImageData?.profile_image_url) {
      setBasicInfo((prev) => ({
        ...prev,
        profile_picture: profileImageData.profile_image_url,
      }));
    }
  }, [profileImageData]);
  useEffect(() => {
    if (!candidateDetails?.data) return;

    const data = candidateDetails.data;

    setBasicInfo((prev) => ({
      ...prev,
      full_name: data.full_name,
      employment_id: data.employment_id,
      company_name: data.company_name,
      designation: data.designation,
      notice_period_days: data.notice_period_days,
      city: data.city,
      country: data.country,
      summary: data.summary,
      email: data.email_id,
      mobile: data.phone_number,
    }));
  }, [candidateDetails]);

  // Phone is verified only when the API says so (email is verified at sign-up).
  // Until the backend sends one of these flags, the phone shows "Verify".
  const sd = candidateDetails?.data || {};
  const isPhoneVerified = !!(
    sd.phone_verified ??
    sd.is_phone_verified ??
    sd.phone_number_verified ??
    candidate?.phone_verified ??
    false
  );

  const handleVerifyPhone = () => {
    // TODO: connect the phone OTP API (send OTP → enter OTP → verify)
    console.info("Verify phone clicked for", basicInfo.mobile);
  };

  const handleChange = (e) => {
    setBasicInfo({ ...basicInfo, [e.target.name]: e.target.value });
  };

  // Saves LinkedIn through Personal Details, sending every other saved field back as it is
  const saveLinkedIn = async (url) => {
    const payload = {};
    PERSONAL_FIELDS.forEach((k) => {
      if (personalSaved[k] === undefined) return;
      let v = personalSaved[k];
      if (DATE_FIELDS.includes(k) && typeof v === "string" && v.length > 10) v = v.slice(0, 10);
      payload[k] = v;
    });
    payload.linkedin_url = url || null;
    const res = await updatePersonalDetails(payload).unwrap();
    if (res?.success === false) throw new Error(res?.message || "Couldn't save the LinkedIn link.");
    refetchPersonalDetails();
  };

  const handleUpdate = async () => {
    // LinkedIn: optional, but must be a linkedin.com profile link when filled
    const cleanLinkedIn = normalizeLinkedIn(linkedinDraft);
    if (cleanLinkedIn && !isLinkedInUrl(cleanLinkedIn)) {
      setLinkedinError("Enter a LinkedIn profile link, e.g. linkedin.com/in/your-name");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      if (cleanLinkedIn !== normalizeLinkedIn(savedLinkedIn)) {
        await saveLinkedIn(cleanLinkedIn);
      }
      const payload = {
        full_name: basicInfo.full_name,
        employment_id: candidateDetails?.data?.employment_id,
        notice_period_days: Number(basicInfo.notice_period_days),
        company_name: basicInfo.company_name,
        designation: basicInfo.designation,
        city: basicInfo.city,
        country: basicInfo.country,
        summary: basicInfo.summary,
      };

      const formData = new URLSearchParams();
      Object.keys(payload).forEach((key) => {
        formData.append(key, payload[key] ?? "");
      });

      const response = await updateCandidateProfileDetails(formData).unwrap();

      if (response?.success || response?.status === 200) {
        refetch();
        setOpen(false);
      } else {
        setSaveError(response?.message || "Couldn't update your details. Please try again.");
      }
    } catch (error) {
      console.error("Error updating candidate:", error);
      setSaveError(
        error?.data?.message ||
          (typeof error?.data?.detail === "string" ? error.data.detail : "") ||
          error?.message ||
          "Couldn't update your details. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const validateImageFile = (file) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
    const maxSize = 2 * 1024 * 1024;

    if (!file) {
      setUploadError("No file selected.");
      return false;
    }
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Only PNG, JPG, JPEG, and GIF files are supported.");
      return false;
    }
    if (file.size > maxSize) {
      setUploadError("File size exceeds 2MB limit.");
      return false;
    }
    setUploadError(null);
    return true;
  };

  const handleImageUpload = async (file) => {
  try {
    const formData = new FormData();
    formData.append("profile_image", file);

    const response = await uploadCandidateProfileImage(formData).unwrap();

    if (response?.success || response?.status === 200) {
      // Fetch latest profile image from API
      const imageResponse = await refetchProfileImage();

      if (
        imageResponse?.data?.success &&
        imageResponse?.data?.profile_image_url
      ) {
        setBasicInfo((prev) => ({
          ...prev,
          profile_picture: imageResponse.data.profile_image_url,
        }));
      }

      setUploadError(null);
      setImageDialogOpen(false);
    }
  } catch (error) {
    console.error("Error uploading profile image:", error);
    setUploadError("Failed to upload profile image. Please try again.");
  }
};

  /* Values shown in the card */
  const headline = [basicInfo.designation, basicInfo.company_name].filter(Boolean).join(" at ");
  const location = [basicInfo.city, basicInfo.country].filter(Boolean).join(", ");
  const totalExp =
    candidateDetails?.data?.total_experience?.replace(" years", "y").replace(" months", "m") || "";
  const rel = candidateDetails?.data?.relevant_experience;
  const relevantExp = rel ? `${rel.years ?? 0}y ${rel.months ?? 0}m` : "";
  const notice = Number(basicInfo.notice_period_days);
  const noticeText =
    basicInfo.notice_period_days === "" || basicInfo.notice_period_days === null || basicInfo.notice_period_days === undefined
      ? ""
      : notice === 0
      ? "Immediate"
      : `${notice} days`;
  const linkedinHref = savedLinkedIn ? normalizeLinkedIn(savedLinkedIn) : "";

  return (
    <Paper
      elevation={0}
      sx={{ border: `1px solid ${palette.line}`, borderRadius: "16px", overflow: "hidden", bgcolor: palette.paper }}
    >
      {/* ── Cover band ── */}
      <Box
        sx={{
          height: { xs: 72, sm: 88 },
          position: "relative",
          background: `linear-gradient(120deg, ${palette.tealDeep} 0%, ${palette.teal} 60%, #3E9A93 100%)`,
          // soft dotted texture
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          },
        }}
      >
        {/* Edit details — top right on the band */}
        <Button
          onClick={openEditor}
          startIcon={<EditOutlinedIcon sx={{ fontSize: 17 }} />}
          sx={{
            position: "absolute",
            top: { xs: 10, sm: 14 },
            right: { xs: 10, sm: 16 },
            zIndex: 1,
            textTransform: "none",
            fontWeight: 700,
            fontSize: 13,
            borderRadius: "10px",
            px: 1.5,
            py: 0.5,
            color: palette.teal,
            bgcolor: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            "&:hover": { bgcolor: "#F2F8F7" },
          }}
        >
          Edit details
        </Button>
      </Box>

      <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pb: { xs: 2.5, sm: 3 } }}>
        {/* ── Avatar (overlapping the band) + name ── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1.5, sm: 2.5 },
            mt: { xs: "-44px", sm: "-52px" },
          }}
        >
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={basicInfo.profile_picture || undefined}
              alt={basicInfo.full_name}
              onClick={() => setImageDialogOpen(true)}
              sx={{
                width: { xs: 88, sm: 104 },
                height: { xs: 88, sm: 104 },
                cursor: "pointer",
                bgcolor: palette.tealSoft,
                color: palette.teal,
                fontFamily: fonts.display,
                fontSize: 36,
                fontWeight: 600,
                border: "4px solid #fff",
                boxShadow: "0 4px 14px rgba(14,74,69,0.18)",
              }}
            >
              {(basicInfo.full_name?.[0] || "?").toUpperCase()}
            </Avatar>
            <Tooltip title="Change photo" arrow>
              <IconButton
                component="label"
                size="small"
                aria-label="Change profile photo"
                sx={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  bgcolor: palette.teal,
                  color: "#fff",
                  border: "2px solid #fff",
                  width: 30,
                  height: 30,
                  "&:hover": { bgcolor: palette.tealDeep },
                }}
              >
                <AddAPhotoIcon sx={{ fontSize: 15 }} />
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && validateImageFile(file)) {
                      const imageUrl = URL.createObjectURL(file);
                      setBasicInfo((prev) => ({ ...prev, profile_picture: imageUrl }));
                      handleImageUpload(file);
                    }
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>

          {/* text starts below the band (the avatar alone overlaps it) */}
          <Box sx={{ flex: 1, minWidth: 0, pt: { xs: 0, sm: "64px" } }}>
            <Typography
              sx={{
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: { xs: 22, sm: 26 },
                color: palette.ink,
                lineHeight: 1.2,
                overflowWrap: "anywhere",
              }}
            >
              {basicInfo.full_name || "Your name"}
            </Typography>
            {headline && (
              <Typography sx={{ fontSize: { xs: 14, sm: 15 }, color: palette.ink, mt: 0.5, fontWeight: 500 }}>
                {headline}
              </Typography>
            )}
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 2, rowGap: 0.5, mt: 0.75 }}>
              {location && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <LocationOnOutlinedIcon sx={{ fontSize: 16, color: palette.muted }} />
                  <Typography sx={{ fontSize: 13, color: palette.muted }}>{location}</Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <UpdateRoundedIcon sx={{ fontSize: 16, color: palette.muted }} />
                <Typography sx={{ fontSize: 13, color: palette.muted }}>Updated {lastUpdatedDate}</Typography>
              </Box>
            </Box>
          </Box>

          {/* LinkedIn button (desktop: right side) */}
          {linkedinHref && (
            <Button
              component="a"
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LinkedInIcon />}
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: "15px !important" }} />}
              sx={{
                alignSelf: "flex-start",
                mt: { xs: 0, sm: "68px" },
                flexShrink: 0,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                borderRadius: "10px",
                px: 1.5,
                color: "#0A66C2",
                border: "1px solid #CFE0F3",
                bgcolor: "#F3F8FD",
                "&:hover": { bgcolor: "#E8F1FB", borderColor: "#0A66C2" },
              }}
            >
              LinkedIn
            </Button>
          )}
        </Box>

        {/* ── Stat tiles ── */}
        <Box
          sx={{
            mt: { xs: 2.25, sm: 2.75 },
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          <StatTile icon={<WorkOutlineIcon sx={{ fontSize: 18 }} />} label="Total exp" value={totalExp} />
          <StatTile icon={<TimelineOutlinedIcon sx={{ fontSize: 18 }} />} label="Relevant" value={relevantExp} />
          <StatTile icon={<EventAvailableOutlinedIcon sx={{ fontSize: 18 }} />} label="Notice" value={noticeText} />
        </Box>

        {/* ── Contact ── */}
        <Box
          sx={{
            mt: { xs: 2, sm: 2.5 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            columnGap: 3,
            rowGap: 0.25,
          }}
        >
          <ContactRow icon={<EmailOutlined sx={{ fontSize: 18 }} />} verified={!!basicInfo.email}>
            {basicInfo.email || "—"}
          </ContactRow>
          <ContactRow
            icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />}
            verified={isPhoneVerified}
            action={
              !isPhoneVerified && basicInfo.mobile ? (
                <LinkAction onClick={handleVerifyPhone} color={palette.amber}>
                  Verify
                </LinkAction>
              ) : null
            }
          >
            {formatPhone(basicInfo.mobile) || "—"}
          </ContactRow>
          <ContactRow
            icon={<LinkedInIcon sx={{ fontSize: 19, color: linkedinHref ? "#0A66C2" : palette.muted }} />}
            href={linkedinHref || undefined}
            action={
              !linkedinHref ? (
                <LinkAction onClick={openEditor}>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
                    <AddRoundedIcon sx={{ fontSize: 16 }} /> Add LinkedIn
                  </Box>
                </LinkAction>
              ) : null
            }
          >
            {linkedinHref ? shortLinkedIn(linkedinHref) : ""}
          </ContactRow>
        </Box>

        {(uploadError || viewError) && (
          <Typography sx={{ color: palette.coral, fontSize: 13, mt: 1.5 }}>
            {uploadError || viewError}
          </Typography>
        )}

        {/* ── About ── */}
        <Divider sx={{ my: { xs: 2, sm: 2.5 }, borderColor: palette.line }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <NotesOutlinedIcon sx={{ fontSize: 18, color: palette.teal }} />
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 15, color: palette.ink }}>
            About
          </Typography>
        </Box>
        <AboutText text={basicInfo.summary} onAdd={openEditor} />
      </Box>

      {/* ── Edit Dialog — same design as the Personal Details dialog ── */}
      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px" } }}
      >
        <DialogTitle sx={{ fontFamily: fonts.display, fontWeight: 600, color: palette.ink }}>
          Edit Information
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8, color: palette.teal }}
          >
            <GridCloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* ── Basic Info ─────────────────────────────────────────────── */}
          <GroupHeading icon={BadgeOutlinedIcon} title="Basic Info" />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Full Name"
                name="full_name"
                value={basicInfo.full_name || ""}
                onChange={handleChange}
                sx={dialogFieldSx}
              />
            </Grid>
          </Grid>

          {/* ── Current Role ───────────────────────────────────────────── */}
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2, borderColor: palette.line }} />
            <GroupHeading icon={WorkOutlineIcon} title="Current Role" />
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Company Name"
                  name="company_name"
                  value={basicInfo.company_name || ""}
                  onChange={handleChange}
                  sx={dialogFieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Designation"
                  name="designation"
                  value={basicInfo.designation || ""}
                  onChange={handleChange}
                  sx={dialogFieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Notice Period (Days)"
                  name="notice_period_days"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={basicInfo.notice_period_days ?? ""}
                  onChange={handleChange}
                  helperText="Enter 0 if you can join immediately"
                  sx={dialogFieldSx}
                />
              </Grid>
            </Grid>
          </Box>

          {/* ── Location ───────────────────────────────────────────────── */}
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2, borderColor: palette.line }} />
            <GroupHeading icon={LocationOnOutlinedIcon} title="Location" />
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="City"
                  name="city"
                  value={basicInfo.city || ""}
                  onChange={handleChange}
                  sx={dialogFieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Country"
                  name="country"
                  value={basicInfo.country || ""}
                  onChange={handleChange}
                  sx={dialogFieldSx}
                />
              </Grid>
            </Grid>
          </Box>

          {/* ── Online profile ─────────────────────────────────────────── */}
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2, borderColor: palette.line }} />
            <GroupHeading icon={LinkedInIcon} title="Online Profile" />
            <TextField
              fullWidth
              size="small"
              label="LinkedIn Profile URL"
              placeholder="linkedin.com/in/your-name"
              value={linkedinDraft}
              onChange={(e) => {
                setLinkedinDraft(e.target.value);
                setLinkedinError("");
              }}
              onBlur={() => linkedinDraft && setLinkedinDraft(normalizeLinkedIn(linkedinDraft))}
              error={!!linkedinError}
              helperText={linkedinError || "Optional — shown on your profile for recruiters"}
              inputProps={{ inputMode: "url", maxLength: 200 }}
              InputProps={{
                startAdornment: (
                  <LinkedInIcon sx={{ fontSize: 18, color: "#0A66C2", mr: 1 }} />
                ),
              }}
              sx={dialogFieldSx}
            />
          </Box>

          {/* ── About ──────────────────────────────────────────────────── */}
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2, borderColor: palette.line }} />
            <GroupHeading icon={NotesOutlinedIcon} title="About" />
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={4}
              label="Professional Summary"
              name="summary"
              placeholder="A short summary of your experience and strengths"
              value={basicInfo.summary || ""}
              onChange={handleChange}
              sx={dialogFieldSx}
            />
          </Box>
        </DialogContent>

        {saveError && (
          <Typography sx={{ color: palette.coral, fontSize: 13, px: 3, pt: 1.5 }}>{saveError}</Typography>
        )}
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="outlined"
            disabled={saving}
            onClick={() => setOpen(false)}
            sx={{ borderColor: palette.line, color: palette.ink, textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={saving}
            sx={{
              bgcolor: palette.teal,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: palette.tealDeep },
            }}
          >
            {saving ? "Saving..." : "Update Profile"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Image Edit Dialog ── */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px" } }}
      >
        <DialogTitle sx={{ fontFamily: fonts.display, fontWeight: 600, color: palette.ink }}>
          Profile Photo
        </DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" mt={1} mb={2}>
            <Avatar
              sx={{ width: 120, height: 120, border: `2px solid ${palette.teal}` }}
              src={basicInfo.profile_picture || undefined}
              alt={basicInfo.full_name}
            />
          </Box>
          <Typography align="center" sx={{ color: palette.muted, fontSize: 13 }} gutterBottom>
            Last updated -{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Typography>
          <Button
            variant="contained"
            fullWidth
            component="label"
            sx={{ bgcolor: palette.teal, textTransform: "none", mt: 1, "&:hover": { bgcolor: palette.tealDeep } }}
          >
            Replace Photo
            <input
              type="file"
              hidden
              accept="image/png,image/jpeg,image/jpg,image/gif"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && validateImageFile(file)) {
                  const imageUrl = URL.createObjectURL(file);
                  setBasicInfo((prev) => ({
                    ...prev,
                    profile_picture: imageUrl,
                  }));
                  handleImageUpload(file);
                }
              }}
            />
          </Button>
          <Typography variant="caption" align="center" display="block" sx={{ color: palette.muted, mt: 1 }}>
            Supported file format: png, jpg, jpeg, gif - up to 2MB
          </Typography>
          {uploadError && (
            <Typography sx={{ color: palette.coral, fontSize: 12, mt: 1 }} align="center">
              {uploadError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)} sx={{ color: palette.coral, textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default React.memo(BasicInformation);