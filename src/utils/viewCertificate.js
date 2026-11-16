// src/utils/viewCertificate.js
//
// Opens a candidate's certificate in a new tab through
//   GET /candidate/view-certificate/{cert_id}/
//
// The backend can answer in two ways, and both are handled:
//   1. the file itself (PDF / image bytes)       → shown from a temporary blob link
//   2. JSON with a link, e.g. { data: { url } }   → that link is opened
//
// The new tab is opened straight away on click (before the API answers),
// otherwise browsers treat it as a pop-up and block it.
// candidateApi already adds the Bearer token and refreshes it on 401.
import candidateApi from "../services/candidateApi";

const linkFromJson = (json) =>
  json?.certificate_url ||
  json?.view_url ||
  json?.url ||
  json?.data?.certificate_url ||
  json?.data?.view_url ||
  json?.data?.url ||
  (typeof json?.data === "string" && /^https?:\/\//i.test(json.data) ? json.data : "");

const loadingPage = `<!doctype html><title>Opening certificate…</title>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
font-family:Arial,sans-serif;color:#6B7280;background:#F8FAF9">Opening certificate…</body>`;

/**
 * @param {string|number} certId
 * @param {string} [fallbackUrl]  the certificate_url from GET /certifications, used if the API fails
 */
export async function viewCertificate(certId, fallbackUrl = "") {
  // 1. open the tab now, while we still have the user's click
  const tab = window.open("", "_blank");
  if (tab) {
    tab.document.write(loadingPage);
    tab.document.close();
  }

  const show = (url) => {
    if (tab && !tab.closed) tab.location.href = url;
    else window.open(url, "_blank", "noopener"); // pop-ups blocked → try a normal open
  };

  try {
    const res = await candidateApi.get(`/candidate/view-certificate/${encodeURIComponent(certId)}/`, {
      responseType: "blob",
    });
    const blob = res.data;
    const type = (res.headers?.["content-type"] || blob?.type || "").toLowerCase();

    // JSON → find the link (the API may also report errors in a 200 body)
    if (type.includes("application/json")) {
      let json = null;
      try {
        json = JSON.parse(await blob.text());
      } catch {
        /* not JSON after all */
      }
      if (json && (json.success === false || (json.status && Number(json.status) >= 400))) {
        throw new Error(json.message || json.detail || "Certificate not found.");
      }
      const link = linkFromJson(json);
      if (!link) throw new Error("Certificate link not found.");
      show(link);
      return;
    }

    // The file itself → show it from a temporary link
    const blobUrl = URL.createObjectURL(blob);
    show(blobUrl);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (err) {
    if (fallbackUrl) {
      show(fallbackUrl); // API failed but we already have the file link
      return;
    }
    if (tab && !tab.closed) tab.close();

    // readable message from an axios error with a Blob body
    let message = err?.message || "";
    const data = err?.response?.data;
    if (data instanceof Blob) {
      try {
        const json = JSON.parse(await data.text());
        message = json.message || json.detail || message;
      } catch {
        /* keep message */
      }
    }
    throw new Error(message || "Couldn't open the certificate. Please try again.");
  }
}