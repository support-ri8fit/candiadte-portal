// src/pages/Candidate/NotFound.jsx
//
// Shown for any address that doesn't exist (e.g. /for-candidate/abcd).
// Logged-in candidates get "Go to my profile", everyone else "Go to login".
import React from "react";
import { Box, Typography, Button } from "@mui/material";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import { useNavigate } from "react-router-dom";
import { getItem, CANDIDATE_ACCESS_TOKEN, IS_AUTHENTICATED } from "../../utils/helper";

const INK = "#1F2937";
const MUTED = "#6B7280";
const PRIMARY = "#2B6F71";
const PRIMARY_DARK = "#1E4F50";
const TINT = "#EAF5F4";

export default function NotFound() {
  const navigate = useNavigate();
  const loggedIn = getItem(IS_AUTHENTICATED) === "true" && !!getItem(CANDIDATE_ACCESS_TOKEN);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F6F8F7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 440,
          bgcolor: "#fff",
          border: "1px solid #E1E5E7",
          borderRadius: "18px",
          boxShadow: "0 10px 30px rgba(31,41,55,0.06)",
          p: { xs: 3, sm: 4.5 },
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: "auto",
            mb: 2,
            borderRadius: "50%",
            bgcolor: TINT,
            color: PRIMARY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SearchOffRoundedIcon sx={{ fontSize: 30 }} />
        </Box>

        <Typography sx={{ fontSize: 13, fontWeight: 700, color: PRIMARY, letterSpacing: 1 }}>
          ERROR 404
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontWeight: 700,
            fontSize: { xs: 22, sm: 26 },
            color: INK,
            mt: 0.5,
          }}
        >
          Page not found
        </Typography>
        <Typography sx={{ fontSize: 14, color: MUTED, mt: 1, lineHeight: 1.6 }}>
          The page you're looking for doesn't exist or may have moved. Check the address, or go back to{" "}
          {loggedIn ? "your profile" : "the login page"}.
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "center",
            gap: 1,
            mt: 3,
          }}
        >
          <Button
            variant="contained"
            disableElevation
            onClick={() => navigate(loggedIn ? "/for-candidate/profile" : "/for-candidate/login", { replace: true })}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              px: 3,
              minHeight: 42,
              bgcolor: PRIMARY,
              "&:hover": { bgcolor: PRIMARY_DARK },
            }}
          >
            {loggedIn ? "Go to my profile" : "Go to login"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "10px",
              px: 3,
              minHeight: 42,
              color: INK,
              borderColor: "#E1E5E7",
              "&:hover": { borderColor: PRIMARY, bgcolor: TINT },
            }}
          >
            Go back
          </Button>
        </Box>
      </Box>
    </Box>
  );
}