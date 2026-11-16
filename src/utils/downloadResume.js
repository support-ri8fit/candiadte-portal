// src/utils/downloadResume.js
//
// Downloads the logged-in candidate's resume through
//   GET /candidate/resume_download/
//
// The backend can answer in two ways, and both are handled:
//   1. the file itself (PDF / image bytes)        → saved straight away
//   2. JSON with a link, e.g. { data: { url } }    → the link is downloaded
//
// candidateApi already adds the Bearer token and refreshes it on 401.
import candidateApi from "../services/candidateApi";

/* Pick a file name from the Content-Disposition header, e.g.
   attachment; filename="John_Resume.pdf"  /  filename*=UTF-8''John%20Resume.pdf */
const fileNameFromHeader = (header) => {
  if (!header) return "";
  const star = header.match(/filename\*\s*=\s*[^']*''([^;]+)/i);
  if (star) return decodeURIComponent(star[1].trim().replace(/"/g, ""));
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : "";
};

/* Find a link anywhere the backend might put it */
const linkFromJson = (json) =>
  json?.download_url ||
  json?.url ||
  json?.resume_url ||
  json?.data?.download_url ||
  json?.data?.url ||
  json?.data?.resume_url ||
  (typeof json?.data === "string" && /^https?:\/\//i.test(json.data) ? json.data : "");

/* Save a Blob as a file */
const saveBlob = (blob, fileName) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName || "Resume";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};

/* Download a (usually S3 pre-signed) link. If the storage blocks the
   browser from reading it (CORS), open it in a new tab instead. */
const saveFromUrl = async (url, fileName) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    saveBlob(await res.blob(), fileName);
  } catch {
    window.open(url, "_blank", "noopener");
  }
};

/**
 * @param {string} fallbackName  name to use when the backend doesn't send one
 * @returns {Promise<string>}     the file name that was saved
 */
export async function downloadResume(fallbackName = "Resume") {
  const res = await candidateApi.get("/candidate/resume_download/", { responseType: "blob" });
  const blob = res.data;
  const type = (res.headers?.["content-type"] || blob?.type || "").toLowerCase();

  // Case 2: JSON → read it (the API may also report errors in a 200 JSON body)
  if (type.includes("application/json")) {
    let json = null;
    try {
      json = JSON.parse(await blob.text());
    } catch {
      /* not JSON after all */
    }
    if (json && (json.success === false || (json.status && Number(json.status) >= 400))) {
      throw new Error(json.message || json.detail || "Resume not found.");
    }
    const link = linkFromJson(json);
    if (!link) throw new Error("Download link not found. Please try again.");
    const nameFromLink = decodeURIComponent(link.split("?")[0].split("/").pop() || "");
    await saveFromUrl(link, nameFromLink || fallbackName);
    return nameFromLink || fallbackName;
  }

  // Case 1: the file itself
  const fileName = fileNameFromHeader(res.headers?.["content-disposition"]) || fallbackName;
  saveBlob(blob, fileName);
  return fileName;
}

/* Turn an axios error (with a Blob body) into a readable message */
export async function downloadErrorMessage(err) {
  try {
    const data = err?.response?.data;
    if (data instanceof Blob) {
      const json = JSON.parse(await data.text());
      return json.message || json.detail || "";
    }
    return data?.message || data?.detail || err?.message || "";
  } catch {
    return err?.message || "";
  }
}