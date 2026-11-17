import React, { useEffect, useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Tooltip,
  IconButton,
  Avatar,
  Breadcrumbs,
  Menu, MenuItem,
  useMediaQuery,
  useTheme,
  Badge,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import { Outlet, useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeIcon from "@mui/icons-material/Home";
import { palette, fonts } from "../theme/candidateTokens";
import logoDark from "../assets/Ri8fit_Logo.png";
import {
  candidateClearLocalStorage,
  getItem,
  CANDIDATE_ACCESS_TOKEN,
  ACCESS_TOKEN,
} from "../utils/helper";
import { clearCandidateAuth } from "../utils/authStorage";
import candidateApi from "../services/candidateApi";
import LogoutIcon from "@mui/icons-material/Logout";
import { Assessment, BusinessCenter, PeopleOutlineOutlined, Person, Person2, Person2Outlined } from "@mui/icons-material";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import { useSelector } from "react-redux";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useCandidateLogoutMutation } from "../store/api/settings/CandidatePortalApis";
import QrJobPrompt from "./QrJobPrompt";
/* ── Candidate display name ───────────────────────────────────────────────
   The name can sit in different places depending on how the user got here
   (login response, register / resume data, old localStorage) — use the
   first one that has a value, and fall back to the email's first part. */
const safeParse = (raw) => {
  try {
    return raw && raw !== "undefined" ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const nameOf = (o) =>
  !o
    ? ""
    : (
        o.full_name ||
        o.name ||
        [o.first_name, o.last_name].filter(Boolean).map((s) => String(s).trim()).join(" ") ||
        o.username ||
        ""
      ).trim();
const resolveCandidateName = (...sources) => {
  for (const s of sources) {
    const n = nameOf(s);
    if (n) return n;
  }
  const email = sources.find((s) => s?.email)?.email;
  return email ? email.split("@")[0] : "";
};
const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "U";

const avatarSx = (size) => ({
  width: size,
  height: size,
  fontSize: size * 0.4,
  fontWeight: 700,
  letterSpacing: 0.3,
  color: "#fff",
  background: `linear-gradient(135deg, ${palette.teal} 0%, ${palette.tealDeep || "#174f52"} 100%)`,
  boxShadow: "0 2px 6px rgba(31, 107, 101, 0.25)",
});

const SIDEBAR_WIDTH_OPEN = 220;
const SIDEBAR_WIDTH_CLOSED = 76; // desktop, collapsed with the hamburger
// Phones / tablets: icon-only rail, never the full menu
const RAIL_WIDTH = { xs: 60, sm: 72 };
const TOPBAR_HEIGHT = 64;
const TOPBAR_HEIGHT_XS = 56;

const MAIN_ITEMS = [
  { label: "Profile", path: "/for-candidate/profile", icon: <Person />, disabled: false },
  // { label: "Candidates", path: "/acc/candidates", icon: <PeopleAltIcon />, disabled: true },
  { label: "Jobs", path: "/for-candidate/requisitions", icon: <WorkOutlineIcon />, disabled: false },
  { label: "Gap Analysis", path: "/for-candidate/analysis", icon: <AnalyticsOutlinedIcon />, disabled: false },
  { label: "Interviews", path: "/for-candidate/interviews", icon: <AssignmentIndIcon />, disabled: true },
];

const SETTINGS_ITEMS = [
  { label: "Settings", path: "/for-candidate/settings", icon: <SettingsIcon />, disabled: false },
];

// Simple path -> breadcrumb label mapping; extend as more routes are added
const BREADCRUMB_LABELS = {
  "/for-candidate/profile": "Profile",
  "/acc/candidates": "Candidates",
  "/acc/requisitions": "Requisitions",
  "/acc/interviews": "Interviews",
  "/acc/settings": "Settings",
  "/for-candidate/settings": "Settings",
};

function CandidateLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  // Phones AND tablets (< 900px, incl. iPad portrait): icons only, names on hover.
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));
  // Desktop: expand/collapse with the hamburger icon.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const effectiveSidebarOpen = isCompact ? false : sidebarOpen;

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const user = safeParse(getItem("candidate_user"));

  // Name for the top-right corner — same API the profile header uses
  // (GET /candidate/profile/specific-details → data.full_name).
  // Fetch once on layout mount to avoid route-switch refetch churn.
  const [profileDetails, setProfileDetails] = useState(null);
  const [candidateLogout] = useCandidateLogoutMutation();
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    let active = true;
    const token = getItem(CANDIDATE_ACCESS_TOKEN) || getItem(ACCESS_TOKEN);
    if (!token) return undefined;
    candidateApi
      .get("/candidate/profile/specific-details", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        if (active && data) setProfileDetails(data);
      })
      .catch((err) => console.error("Couldn't load profile name", err));
    return () => {
      active = false;
    };
  }, []);
  const loginUser = useSelector((state) => state?.candidate?.formData?.loginDetails?.user);
  const candidateDetails = useSelector((state) => state?.candidate?.formData?.candidateDetails);
  const displayName =
    resolveCandidateName(profileDetails, candidateDetails, loginUser, user) || "User";
  const displayEmail =
    profileDetails?.email_id || candidateDetails?.email || loginUser?.email || user?.email || "";

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };



  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  // const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;
  const sidebarWidth = effectiveSidebarOpen
    ? SIDEBAR_WIDTH_OPEN
    : SIDEBAR_WIDTH_CLOSED;
    const navItems = [
  {
    label: "Profile",
    path: "/for-candidate/profile",
    icon: <Person2 />,
  },
  {
    label: "Jobs",
    path: "/for-candidate/requisitions",
    icon: <BusinessCenter />,
  },
  {
    label: "Gap Analysis",
    path: "/for-candidate/analysis",
    icon: <Assessment />,
  },
  {
    label: "Interviews",
    path: "/for-candidate/interviews",
    icon: <AssignmentIndIcon />
  },
  {
  label: "Settings",
  path: "/for-candidate/settings",
  icon: <SettingsIcon />,
},
];
   const currentItem = navItems.find(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(`${item.path}/`)
  );

  // Sub-pages get a second crumb, e.g. /for-candidate/requisitions/123 → "Jobs › Job details"
  const SUB_PAGE_LABELS = {
    "/for-candidate/requisitions": "Job details",
  };
  const isSubPage = !!currentItem && location.pathname !== currentItem.path;
  const subPageLabel = isSubPage
    ? SUB_PAGE_LABELS[currentItem.path] || "Details"
    : null;
  const sectionIcon = currentItem
    ? React.cloneElement(currentItem.icon, { sx: { fontSize: 16 } })
    : null;

const currentLabel = currentItem?.label || "Page";

  const renderSectionLabel = (label) =>
    effectiveSidebarOpen && (
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: palette.muted,
          px: 1.5,
          mb: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
    );

  const renderNavItem = (item) => {
    const active = !item.disabled && isActive(item.path);

    const button = (
      <ListItemButton
        key={item.path}
        selected={active}
        disabled={item.disabled}
        component={item.disabled ? "div" : RouterLink}
        to={item.disabled ? undefined : item.path}
        onClick={(event) => {
          if (item.disabled) {
            event.preventDefault();
          }
        }}
        sx={{
          borderRadius: "10px",
          mb: 0.5,
          minHeight: 44,
          textDecoration: "none",

          justifyContent: effectiveSidebarOpen
            ? "flex-start"
            : "center",

          px: effectiveSidebarOpen ? 1.5 : 0,

          color: active ? palette.teal : palette.muted,

          "&.Mui-selected": {
            backgroundColor: palette.tealSoft,
            color: palette.teal,

            "&:hover": {
              backgroundColor: palette.tealSoft,
            },
          },

          "@media (hover: hover)": {
            "&:hover": { backgroundColor: palette.tealSoft },
          },

          "&.Mui-disabled": {
            opacity: 0.45,
            color: palette.muted,
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: effectiveSidebarOpen ? 36 : 0,
            justifyContent: "center",
            color: active ? palette.teal : palette.muted,
          }}
        >
          {item.icon}
        </ListItemIcon>

        {effectiveSidebarOpen && (
          <>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                color: active ? palette.ink : palette.muted,
              }}
            />

            {active && (
              <ChevronRightIcon
                sx={{
                  fontSize: 18,
                  color: palette.teal,
                }}
              />
            )}
          </>
        )}
      </ListItemButton>
    );

    if (item.disabled) {
      return (
        <Tooltip
          key={item.path}
          title={effectiveSidebarOpen ? "Coming soon" : `${item.label} · Coming soon`}
          placement="right"
          arrow
          enterTouchDelay={0}
          leaveTouchDelay={1500}
        >
          <span style={{ display: "block" }}>
            {button}
          </span>
        </Tooltip>
      );
    }

    if (!effectiveSidebarOpen) {
      return (
        <Tooltip
          key={item.path}
          title={item.label}
          placement="right"
          arrow
          enterDelay={150}
        >
          <span style={{ display: "block" }}>
            {button}
          </span>
        </Tooltip>
      );
    }

    return button;
  };

  // Logout: tell the backend (GET /auth/candidate/logout), then always clear local auth
  const handleLogout = async () => {
    if (loggingOut) return; // ignore double clicks
    setLoggingOut(true);
    try {
      // Tell the backend, but never wait more than 5 seconds
      await Promise.race([
        candidateLogout().unwrap(),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    } catch (err) {
      // Even if the API fails (offline, token expired), still log out locally
      console.warn("Logout API failed — signing out locally", err);
    } finally {
      clearCandidateAuth();          // removes all candidate auth keys
      candidateClearLocalStorage();  // existing helper
      // Full reload wipes Redux + RTK Query cache; replace() stops Back returning here
      window.location.replace("/for-candidate/login");
    }
  };
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: palette.bg || "#f7f9fa" }}>
      {/* TOP BAR — always full width, never moves, never duplicates */}
      <Box
        sx={{
          height: { xs: 56, sm: TOPBAR_HEIGHT },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 1, sm: 2.5 },
          borderBottom: `1px solid ${palette.line}`,
          backgroundColor: palette.paper,
          position: "sticky",
          top: 0,
          zIndex: 1100,
        }}
      >
        {/* Left: hamburger + logo + breadcrumbs */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.5, sm: 1.5 },
            minWidth: 0,
          }}
        >
          {/* Hamburger only on desktop — phones/tablets always use the icon rail */}
          <IconButton
            onClick={() => setSidebarOpen((prev) => !prev)}
            size="small"
            aria-label={sidebarOpen ? "Collapse menu" : "Expand menu"}
            sx={{
              display: { xs: "none", md: "inline-flex" },
              color: palette.teal,
              p: 1,
              "&:hover": {
                backgroundColor: palette.tealSoft,
              },
            }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* <Typography
            noWrap
            sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19, color: palette.ink }}
          > */}
          <Box
            component="img"
            src={logoDark}
            alt="Ri8Fit Logo"
            sx={{
              height: { xs: 24, sm: 30 },
              width: "auto",
              maxWidth: { xs: 90, sm: "none" },
              objectFit: "contain",
              cursor: "pointer",
            }}
            onClick={() => navigate("/for-candidate/profile")}
          />
          {/* </Typography> */}

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              borderColor: palette.line,
              mx: 1,
              display: { xs: "none", sm: "block" },
            }}
          />

                    {currentItem && (
            <Breadcrumbs
              separator={<ChevronRightIcon sx={{ fontSize: { xs: 13, sm: 16 }, color: palette.muted }} />}
              sx={{
                minWidth: 0,
                "& .MuiBreadcrumbs-ol": { alignItems: "center", flexWrap: "nowrap" },
              }}
            >
              {/* Section — a link back to the list only when on a sub-page */}
              <Box
                component={isSubPage ? RouterLink : "span"}
                to={isSubPage ? currentItem.path : undefined}
                aria-current={isSubPage ? undefined : "page"}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                  px: 1.1,
                  py: 0.5,
                  borderRadius: "16px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  fontSize: { xs: 12.5, sm: 13.5 },
                  fontWeight: isSubPage ? 600 : 700,
                  color: isSubPage ? palette.muted : palette.ink,
                  bgcolor: isSubPage ? "transparent" : palette.tealSoft,
                  "& svg": { color: palette.teal },
                  "@media (hover: hover)": isSubPage
                    ? { "&:hover": { bgcolor: palette.tealSoft, color: palette.teal } }
                    : {},
                }}
              >
                {sectionIcon}
                {currentItem.label}
              </Box>

              {isSubPage && (
                <Typography
                  aria-current="page"
                  sx={{
                    px: 1.1,
                    py: 0.5,
                    borderRadius: "16px",
                    bgcolor: palette.tealSoft,
                    fontSize: { xs: 12.5, sm: 13.5 },
                    fontWeight: 700,
                    color: palette.ink,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: { xs: 110, sm: "none" },
                  }}
                >
                  {subPageLabel}
                </Typography>
              )}
            </Breadcrumbs>
          )}
        </Box>

        {/* Right: user info */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ textAlign: "right", minWidth: 0 }}>
            <Typography
              title={displayName}
              sx={{
                fontSize: { xs: 12, sm: 13.5 },
                fontWeight: 700,
                color: palette.ink,
                lineHeight: 1.3,
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: { xs: 90, sm: 200 },
              }}
            >
              {displayName}
            </Typography>
          </Box>
          <Avatar
  sx={{
    ...avatarSx(36),
    cursor: "pointer",
    transition: "transform .15s ease, box-shadow .15s ease",
    "@media (hover: hover)": {
      "&:hover": { transform: "scale(1.05)", boxShadow: "0 4px 12px rgba(31, 107, 101, 0.35)" },
    },
  }}
  onClick={handleAvatarClick}
  aria-label="Open account menu"
>
  {getInitials(displayName)}
</Avatar>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 180,
                borderRadius: 2,
                boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
              },
            }}
          >
                        {/* Who is logged in */}
            <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={avatarSx(40)}>{getInitials(displayName)}</Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  noWrap
                  sx={{ fontSize: 14, fontWeight: 700, color: palette.ink, textTransform: "capitalize" }}
                >
                  {displayName}
                </Typography>
                {displayEmail && (
                  <Typography noWrap sx={{ fontSize: 12, color: palette.muted }}>
                    {displayEmail}
                  </Typography>
                )}
              </Box>
            </Box>
            <Divider sx={{ borderColor: palette.line, my: 0.5 }} />

            <MenuItem
              onClick={() => {
                handleClose();
                navigate("/for-candidate/settings");
              }}
              sx={{
                mx: 1,
                my: 0.25,
                borderRadius: "8px",
                fontSize: 14,
                fontWeight: 600,
                color: palette.teal,
                "& .MuiListItemIcon-root": { color: palette.teal, minWidth: 34 },
                "&:hover": { bgcolor: palette.tealSoft },
              }}
            >
              <ListItemIcon>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleClose();
                handleLogout();
              }}
              sx={{
                mx: 1,
                my: 0.25,
                mb: 1,
                borderRadius: "8px",
                fontSize: 14,
                fontWeight: 600,
                color: "#DC2626",
                "& .MuiListItemIcon-root": { color: "#DC2626", minWidth: 34 },
                "&:hover": { bgcolor: "#FEF2F2" },
              }}
            >
              <ListItemIcon>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>

        </Box>
      </Box>

      {/* BODY: sidebar + content, top bar is NOT repeated here */}
      <Box sx={{ display: "flex" }}>
        <Box
          sx={{
            width: isCompact ? RAIL_WIDTH : sidebarWidth,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${palette.line}`,
            backgroundColor: palette.paper,
            // matches the top bar: 56px on phones, 64px from tablet up
            height: {
              xs: `calc(100vh - ${TOPBAR_HEIGHT_XS}px)`,
              sm: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
            },
            position: "sticky",
            top: { xs: TOPBAR_HEIGHT_XS, sm: TOPBAR_HEIGHT },
            transition: (theme) =>
              theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            overflowX: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {/* MAIN section */}
          <Box sx={{ px: effectiveSidebarOpen ? 1.5 : { xs: 0.75, sm: 1 }, pt: { xs: 1.5, sm: 2.5 } }}>
            {renderSectionLabel("Main")}
            <List sx={{ p: 0 }}>{MAIN_ITEMS.map(renderNavItem)}</List>
          </Box>

          <Divider sx={{ borderColor: palette.line, my: { xs: 1.25, sm: 2 } }} />

          {/* SETTINGS section */}
          <Box sx={{ px: effectiveSidebarOpen ? 1.5 : { xs: 0.75, sm: 1 } }}>
            {renderSectionLabel("Settings")}
            <List sx={{ p: 0 }}>{SETTINGS_ITEMS.map(renderNavItem)}</List>
          </Box>

          {/* Empty spacer at the bottom (no button here) */}
          <Box sx={{ flexGrow: 1 }} />
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            backgroundColor: palette.bg || "#f7f9fa",
          }}
        >
          <Outlet />
        </Box>
      </Box>
      {/* Job QR code visit → "Apply to this job?" (existing and new candidates) */}
      <QrJobPrompt />

      {/* "Signing you out…" overlay while the logout API runs */}
      <Backdrop
        open={loggingOut}
        sx={{ zIndex: (t) => t.zIndex.modal + 1, color: "#fff", flexDirection: "column", gap: 1.5 }}
      >
        <CircularProgress color="inherit" size={32} />
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Signing you out…</Typography>
      </Backdrop>
    </Box>
  );
}

export default CandidateLayout;