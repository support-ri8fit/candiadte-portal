// src/components/QrJobNotice.jsx
//
// Small teal note shown on the Login / Sign-up pages when the visitor came from
// a job QR code (a job id is remembered by utils/qrJob.js). It tells new
// candidates to create an account and existing ones to sign in.
// Renders nothing for a normal visit.
//
//   <QrJobNotice variant="login" onCreateAccount={() => navigate("/for-candidate/signup")} />
//   <QrJobNotice variant="signup" onSignIn={() => navigate("/for-candidate/login")} />
import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import { getQrJobId } from "../utils/qrJob";

export default function QrJobNotice({ variant = "login", onCreateAccount, onSignIn }) {
  const [hasJob] = useState(() => !!getQrJobId());
  if (!hasJob) return null;

  const isLogin = variant === "login";
  const linkSx = {
    color: "#1E4F50",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    background: "none",
    border: 0,
    p: 0,
    font: "inherit",
  };

  return (
    <Box
      role="note"
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        mb: 2.5,
        px: 1.75,
        py: 1.25,
        bgcolor: "#EAF5F4",
        border: "1px solid #BFDCD9",
        borderRadius: "10px",
        textAlign: "left",
      }}
    >
      <QrCode2RoundedIcon sx={{ fontSize: 20, color: "#2B6F71", mt: "1px", flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1E4F50", lineHeight: 1.4 }}>
          You're applying for a job shared with you
        </Typography>
        <Typography sx={{ fontSize: 12, color: "#4B5563", mt: 0.25, lineHeight: 1.5 }}>
          {isLogin ? (
            <>
              Sign in to apply. New here?{" "}
              {onCreateAccount ? (
                <Box component="button" type="button" onClick={onCreateAccount} sx={linkSx}>
                  Create an account
                </Box>
              ) : (
                "Create an account"
              )}{" "}
              — the job stays saved.
            </>
          ) : (
            <>
              Create your account to apply — the job stays saved. Already registered?{" "}
              {onSignIn ? (
                <Box component="button" type="button" onClick={onSignIn} sx={linkSx}>
                  Sign in
                </Box>
              ) : (
                "Sign in"
              )}
            </>
          )}
        </Typography>
      </Box>
    </Box>
  );
}