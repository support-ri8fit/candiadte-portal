// src/utils/qrJob.js
//
// QR registration — a recruiter's job QR code opens the candidate portal with
// the job's id in the link, e.g.
//   https://<portal>/for-candidate/signup?job_id=3f2b…-uuid
//
// The candidate may then go through sign-up → OTP → login → profile registration,
// so the id is kept in localStorage until registration is done. During
// registration it is sent as `job_id` to POST /candidate/upload-resume-additional-details/,
// which then takes domain / role / area of interest from the job itself.

const STORAGE_KEY = "ri8fit_qr_job_id";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // forget an unused QR after 7 days

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Reads ?job_id= (also ?jobId= / ?job=) from the current URL and remembers it.
   Call once when the app starts. Returns the id found, or "". */
export function captureQrJobFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = (params.get("job_id") || params.get("jobId") || params.get("job") || "").trim();
    if (!UUID_RE.test(id)) return "";
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, at: Date.now() }));
    return id;
  } catch {
    return "";
  }
}

/* The remembered QR job id, or "" */
export function getQrJobId() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved?.id || !UUID_RE.test(saved.id)) return "";
    if (Date.now() - (saved.at || 0) > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return "";
    }
    return saved.id;
  } catch {
    return "";
  }
}

/* Forget it — after registration succeeds, or if the candidate opts out */
export function clearQrJobId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}