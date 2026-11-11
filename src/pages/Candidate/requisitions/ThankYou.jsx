import React from "react";
import { Box, Typography, Button } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

const INK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const PRIMARY = "#2B6F71";
const PRIMARY_DARK = "#1E4F50";
const PRIMARY_TINT = "#EAF5F4";
const BORDER = "#E1E5E7";

const FONT_DISPLAY = "'Georgia', 'Times New Roman', serif";

/* ── Shown after a candidate successfully applies to a job ──
   The card is centred in the free space below the top bar (both ways),
   with a fixed max width so it looks the same on phone, iPad and desktop. */
const ThankYou = ({ job, onBackToList }) => (
  <Box
    sx={{
      // fill the content area under the 64px top bar and centre the card in it
      minHeight: { xs: "calc(100vh - 56px)", sm: "calc(100vh - 64px)" },
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      px: { xs: 2, sm: 3 },
      py: { xs: 3, sm: 4 },
      boxSizing: "border-box",
    }}
  >
    <Box
      sx={{
        width: "100%",
        maxWidth: 520,
        bgcolor: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: "18px",
        boxShadow: "0 12px 32px rgba(31, 41, 55, 0.08)",
        px: { xs: 3, sm: 5 },
        py: { xs: 4, sm: 5 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: PRIMARY_TINT,
          color: PRIMARY_DARK,
          mb: 1,
          boxShadow: `0 0 0 8px ${PRIMARY_TINT}66`,
        }}
      >
        <CheckCircleRoundedIcon sx={{ fontSize: 38 }} />
      </Box>

      <Typography
        sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: { xs: 22, sm: 26 }, color: INK }}
      >
        Application Submitted
      </Typography>

      <Typography sx={{ fontSize: { xs: 13.5, sm: 14 }, color: TEXT_MUTED, maxWidth: 400, lineHeight: 1.7 }}>
        Thanks for applying
        {job?.job_title ? (
          <>
            {" to "}
            <Box component="span" sx={{ color: INK, fontWeight: 600 }}>
              {job.job_title}
            </Box>
          </>
        ) : null}
        {job?.organisation?.organisation_name ? (
          <>
            {" at "}
            <Box component="span" sx={{ color: INK, fontWeight: 600 }}>
              {job.organisation.organisation_name}
            </Box>
          </>
        ) : null}
        . The hiring team will review your profile and reach out if there's a match.
      </Typography>

      <Button
        onClick={onBackToList}
        startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 18 }} />}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          fontSize: 14,
          borderRadius: "10px",
          px: 3,
          py: 1.1,
          mt: 2,
          width: { xs: "100%", sm: "auto" },
          color: "#fff",
          bgcolor: PRIMARY,
          "&:hover": { bgcolor: PRIMARY_DARK },
        }}
      >
        Back to Jobs
      </Button>
    </Box>
  </Box>
);

export default ThankYou;