import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useDispatch } from "react-redux";
import { format, isValid } from "date-fns";
import { toast } from "react-toastify";
import {
  useGetCandidateResumeQuery,
  useReplaceCandidateResumeMutation,
} from "../../../../store/api/settings/CandidatePortalApis";
import { candidateUpdateFormData } from "../../../../store/slices/candidateSlice";
import { downloadResume, downloadErrorMessage } from "../../../../utils/downloadResume";

const ACCENT = "#2B6F71";
const ACCENT_HOVER = "#1F5557";
const ACCENT_TINT = "#EAF5F4";
const LINE = "#E5E7EB";
const MUTED = "#6B7280";
const INK = "#1F2937";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg";

/* Device helpers — finger input gets 44px tap targets; hover only with a mouse */
const TOUCH = "@media (pointer: coarse)";
const HOVER = "@media (hover: hover)";

/* Dialog buttons: side by side on tablet/desktop, full width + stacked on phones */
const dialogActionsSx = {
  px: { xs: 2.5, sm: 3 },
  pb: { xs: 2.5, sm: 2 },
  pt: 1,
  gap: 1,
  flexDirection: { xs: "column-reverse", sm: "row" },
  "& > :not(style) ~ :not(style)": { ml: { xs: 0, sm: 1 } },
  "& .MuiButton-root": { width: { xs: "100%", sm: "auto" }, minHeight: 40, [TOUCH]: { minHeight: 44 } },
};

/* Small square icon button used for download / delete */
const ActionButton = ({ title, onClick, disabled, color, hoverBg, children }) => (
  <Tooltip title={title} arrow>
    <span>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        sx={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          border: `1px solid ${LINE}`,
          bgcolor: "#fff",
          color,
          [HOVER]: { "&:hover": { bgcolor: hoverBg, borderColor: color } },
          [TOUCH]: { width: 44, height: 44 },
        }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

function ResumeSection({ resumeInfo, onSectionComplete }) {
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState(null); // file waiting for "Replace" confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef(null);
  const { data: resumeData } = useGetCandidateResumeQuery();
  const [uploadResume, { isLoading: isUploading }] = useReplaceCandidateResumeMutation();
  const isBusy = isUploading;

  // Extract resume info
  const resumeUrl = resumeData?.resume_url || resumeData?.data?.resume_url;
  const resumeFileName = resumeUrl
    ? decodeURIComponent(resumeUrl.split("?")[0].split("/").pop())
    : "";
  const hasResume = !!resumeFileName;
  const fileExt = resumeFileName.split(".").pop()?.toUpperCase() || "";

  const uploadedRaw = resumeInfo?.uploaded_at || null;
  const uploadedDate = uploadedRaw && isValid(new Date(uploadedRaw)) ? new Date(uploadedRaw) : null;

  // Tell the Profile Completion sidebar whether a resume is uploaded
  useEffect(() => {
    if (resumeData === undefined) return; // still loading
    onSectionComplete?.("resume", hasResume);
  }, [hasResume, resumeData, onSectionComplete]);

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  /* Uploads the picked file — the resume query refetches via invalidatesTags */
  const saveResume = useCallback(
    async (file) => {
      setError("");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const response = await uploadResume(fd).unwrap();

        if (response?.success !== false) {
          toast.success(response?.message || "Resume updated successfully");
          dispatch(
            candidateUpdateFormData({
              section: "resume",
              updates: { fileName: file.name, uploadedDate: new Date().toISOString() },
            }),
          );
        } else {
          toast.error(response?.message || "Resume upload failed");
        }
      } catch (err) {
        console.error("Resume upload error:", err);
        toast.error(err?.data?.detail?.[0]?.msg || "Something went wrong. Please try again.");
      }
    },
    [dispatch, uploadResume],
  );

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files[0];
      // reset so selecting the same file again still fires onChange
      e.target.value = "";
      if (!file) return;

      if (!(file.type === "application/pdf" || file.type.startsWith("image/"))) {
        setError("Please select a PDF or image file");
        return;
      }
      // A resume already exists → ask before overwriting it
      if (hasResume) setPendingFile(file);
      else saveResume(file);
    },
    [hasResume, saveResume],
  );

  const handleConfirmReplace = () => {
    if (pendingFile) saveResume(pendingFile);
    setPendingFile(null);
  };

  const handleDelete = useCallback(() => {
    dispatch(candidateUpdateFormData({ section: "resume", updates: null }));
    setConfirmDelete(false);
  }, [dispatch]);

  // Click on the file name → open it in a new tab to view
  const handleView = useCallback(() => {
    if (!resumeUrl) {
      setError("Resume link not found. Please refresh and try again.");
      return;
    }
    window.open(resumeUrl, "_blank", "noopener");
  }, [resumeUrl]);

  // Download button → GET /candidate/resume_download/
  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setError("");
    setDownloading(true);
    try {
      await downloadResume(resumeFileName || "Resume");
      toast.success("Resume downloaded");
    } catch (err) {
      const message = (await downloadErrorMessage(err)) || "Couldn't download your resume. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  }, [downloading, resumeFileName]);

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: 2,
        p: { xs: 1.75, sm: 2, md: 2.5 },
        mb: 2,
        boxShadow: 1,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <Typography
        variant="subtitle1"
        fontWeight={600}
        sx={{ fontSize: { xs: 16, sm: 18 }, mb: { xs: 1.25, sm: 1.75 } }}
      >
        Resume
      </Typography>

      {hasResume ? (
        /* ── Resume already uploaded: file card + small Replace ─────────────── */
        <Box sx={{ border: `1px solid ${LINE}`, borderRadius: "12px", overflow: "hidden" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.25, sm: 1.5 }, p: { xs: 1.5, sm: 2 } }}>
            <Box
              sx={{
                width: { xs: 38, sm: 42 },
                height: { xs: 38, sm: 42 },
                borderRadius: "10px",
                bgcolor: ACCENT_TINT,
                color: ACCENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DescriptionOutlinedIcon />
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Tooltip title={resumeFileName} arrow placement="top-start">
                <Typography
                  onClick={handleView}
                  sx={{
                    fontSize: { xs: 13.5, sm: 14 },
                    fontWeight: 600,
                    color: INK,
                    cursor: "pointer",
                    overflow: "hidden",
                    // phones: up to 2 lines so more of the name shows; wider: 1 line with "…"
                    display: { xs: "-webkit-box", sm: "block" },
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: { xs: 2, sm: "unset" },
                    overflowWrap: { xs: "anywhere", sm: "normal" },
                    whiteSpace: { xs: "normal", sm: "nowrap" },
                    textOverflow: { sm: "ellipsis" },
                    lineHeight: 1.35,
                    [HOVER]: { "&:hover": { color: ACCENT, textDecoration: "underline" } },
                  }}
                >
                  {resumeFileName}
                </Typography>
              </Tooltip>
              <Typography sx={{ fontSize: { xs: 11.5, sm: 12 }, color: MUTED, mt: 0.25, whiteSpace: "nowrap" }}>
                {fileExt}
                {fileExt && uploadedDate ? " · " : ""}
                {uploadedDate && (
                  <>
                    {/* "Uploaded on" is dropped on phones to keep it to one line */}
                    <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                      Uploaded on{" "}
                    </Box>
                    {format(uploadedDate, "dd MMM yyyy")}
                  </>
                )}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: { xs: 0.75, sm: 1 }, flexShrink: 0 }}>
              <ActionButton title="View" onClick={handleView} color={ACCENT} hoverBg={ACCENT_TINT}>
                <VisibilityOutlinedIcon fontSize="small" />
              </ActionButton>
              <ActionButton
                title={downloading ? "Downloading…" : "Download"}
                onClick={handleDownload}
                disabled={downloading || isBusy}
                color={ACCENT}
                hoverBg={ACCENT_TINT}
              >
                {downloading ? (
                  <CircularProgress size={16} sx={{ color: ACCENT }} />
                ) : (
                  <FileDownloadOutlinedIcon fontSize="small" />
                )}
              </ActionButton>
              <ActionButton
                title="Delete"
                onClick={() => setConfirmDelete(true)}
                color="#DC2626"
                hoverBg="#FEF2F2"
              >
                <DeleteOutlineIcon fontSize="small" />
              </ActionButton>
            </Box>
          </Box>

          {/* Replace strip with overwrite warning */}
          <Box
            sx={{
              display: "flex",
              // phones: message on top, full-width Replace button below
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              gap: { xs: 1.25, sm: 1.5 },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 1.25, sm: 1 },
              bgcolor: "#FFFBEB",
              borderTop: "1px solid #FDE68A",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, minWidth: 0 }}>
              <InfoOutlinedIcon sx={{ fontSize: 16, color: "#B45309", flexShrink: 0, mt: "2px" }} />
              <Typography sx={{ fontSize: { xs: 12, sm: 12.5 }, color: "#92400E", lineHeight: 1.5 }}>
                Uploading a new resume will replace the current one.
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={
                isBusy ? (
                  <CircularProgress size={14} sx={{ color: ACCENT }} />
                ) : (
                  <AutorenewRoundedIcon sx={{ fontSize: 16 }} />
                )
              }
              onClick={openPicker}
              disabled={isBusy}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 13,
                borderRadius: "8px",
                color: ACCENT,
                borderColor: ACCENT,
                bgcolor: "#fff",
                px: 1.5,
                flexShrink: 0,
                minHeight: 34,
                width: { xs: "100%", sm: "auto" },
                "&:hover": { bgcolor: "#fff", borderColor: ACCENT },
                [HOVER]: { "&:hover": { bgcolor: ACCENT_TINT, borderColor: ACCENT_HOVER } },
                [TOUCH]: { minHeight: 44 },
              }}
            >
              {isUploading ? "Uploading..." : "Replace"}
            </Button>
          </Box>
        </Box>
      ) : (
        /* ── No resume yet: dashed upload area ──────────────────────────────── */
        <Box
          onClick={isBusy ? undefined : openPicker}
          sx={{
            opacity: isBusy ? 0.6 : 1,
            pointerEvents: isBusy ? "none" : "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            py: { xs: 2.5, sm: 3.5, md: 4 },
            px: 2,
            textAlign: "center",
            border: "1.5px dashed #D1D5DB",
            borderRadius: "12px",
            bgcolor: "#FAFAFA",
            cursor: "pointer",
            transition: "all .2s ease",
            [HOVER]: { "&:hover": { borderColor: ACCENT, bgcolor: "#F4FBFB" } },
            "&:active": { borderColor: ACCENT, bgcolor: "#F4FBFB" },
          }}
        >
          <CloudUploadOutlinedIcon sx={{ fontSize: { xs: 30, sm: 34 }, color: ACCENT }} />
          <Typography sx={{ fontSize: { xs: 13.5, sm: 14 }, fontWeight: 600, color: INK }}>
            Upload your resume
          </Typography>
          <Button
            size="small"
            variant="contained"
            disableElevation
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "999px",
              bgcolor: ACCENT,
              px: 2.5,
              minHeight: 34,
              "&:hover": { bgcolor: ACCENT },
              [HOVER]: { "&:hover": { bgcolor: ACCENT_HOVER } },
              [TOUCH]: { minHeight: 44, px: 3.5 },
            }}
          >
            {isUploading ? "Uploading..." : "Browse file"}
          </Button>
          <Typography sx={{ fontSize: 11.5, color: MUTED }}>PDF, PNG, JPG</Typography>
        </Box>
      )}

      <input ref={inputRef} type="file" hidden accept={ACCEPTED} onChange={handleFileChange} />

      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: "block" }}>
          {error}
        </Typography>
      )}

      {/* Confirm replace */}
      <Dialog
        open={!!pendingFile}
        onClose={() => setPendingFile(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px", m: { xs: 2, sm: 4 }, width: { xs: "calc(100% - 32px)", sm: "100%" } } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: INK, pb: 1, fontSize: { xs: 17, sm: 20 }, px: { xs: 2.5, sm: 3 } }}>
          Replace resume?
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3 } }}>
          <Typography sx={{ fontSize: { xs: 13.5, sm: 14 }, color: MUTED, overflowWrap: "anywhere" }}>
            <Box component="span" sx={{ color: INK, fontWeight: 600 }}>
              {resumeFileName}
            </Box>{" "}
            will be replaced with{" "}
            <Box component="span" sx={{ color: INK, fontWeight: 600 }}>
              {pendingFile?.name}
            </Box>
            . The current resume will be overwritten.
          </Typography>
        </DialogContent>
        <DialogActions sx={dialogActionsSx}>
          <Button
            onClick={() => setPendingFile(null)}
            variant="outlined"
            sx={{ textTransform: "none", borderColor: LINE, color: INK }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReplace}
            variant="contained"
            disableElevation
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: ACCENT, "&:hover": { bgcolor: ACCENT_HOVER } }}
          >
            Replace
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px", m: { xs: 2, sm: 4 }, width: { xs: "calc(100% - 32px)", sm: "100%" } } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: INK, pb: 1, fontSize: { xs: 17, sm: 20 }, px: { xs: 2.5, sm: 3 } }}>
          Delete resume?
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3 } }}>
          <Typography sx={{ fontSize: { xs: 13.5, sm: 14 }, color: MUTED, overflowWrap: "anywhere" }}>
            <Box component="span" sx={{ color: INK, fontWeight: 600 }}>
              {resumeFileName}
            </Box>{" "}
            will be removed from your profile.
          </Typography>
        </DialogContent>
        <DialogActions sx={dialogActionsSx}>
          <Button
            onClick={() => setConfirmDelete(false)}
            variant="outlined"
            sx={{ textTransform: "none", borderColor: LINE, color: INK }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disableElevation
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default React.memo(ResumeSection);