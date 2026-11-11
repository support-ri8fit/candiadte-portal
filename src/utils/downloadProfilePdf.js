// src/utils/downloadProfilePdf.js
//
// "Download profile (PDF)" — builds a clean, CV-style PDF of the candidate's
// profile in the browser (no backend change needed) and downloads it.
//
// Data comes from the same GET APIs the profile page already uses. Every call
// is optional: if one fails, that section is simply left out of the PDF.
//
// Uses jsPDF (already in package.json) with real text — the PDF is small,
// sharp at any zoom, and the text can be selected / searched.
//
// Usage:
//   import { downloadProfilePdf } from "../../../utils/downloadProfilePdf";
//   await downloadProfilePdf();            // fetches + downloads
import { jsPDF } from "jspdf";
import candidateApi from "../services/candidateApi";

/* ── Look ──────────────────────────────────────────────────────────────── */
const TEAL = [43, 111, 113]; // #2B6F71
const INK = [31, 41, 55]; // #1F2937
const MUTED = [107, 114, 128]; // #6B7280
const LINE = [221, 225, 234]; // #DDE1EA

const PAGE_MARGIN = 48; // pt (A4 = 595 × 842 pt)
const FOOTER_SPACE = 36;

/* ── Small data helpers ───────────────────────────────────────────────── */
const unwrap = (res) => res?.data?.data ?? res?.data ?? null;
const asArray = (v, key) => {
  if (Array.isArray(v)) return v;
  if (key && Array.isArray(v?.[key])) return v[key];
  return [];
};
const asObject = (v) => (Array.isArray(v) ? v[0] || {} : v || {});
const clean = (v) => (v === null || v === undefined ? "" : String(v).trim());

/* Standard PDF fonts only cover Latin text — swap the few common symbols that
   would otherwise print as garbage, and drop anything else outside Latin-1. */
const pdfSafe = (v) =>
  clean(v)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/₹/g, "INR ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* "2022/04/01" · "2022-04-01" · "01/04/2022" · "present" → "Apr 2022" / "Present" */
const monthYear = (value) => {
  const v = clean(value);
  if (!v) return "";
  if (/^present$/i.test(v)) return "Present";
  let y;
  let m;
  let match = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/); // yyyy/MM/dd
  if (match) [, y, m] = match;
  else if ((match = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/))) [, , m, y] = match; // dd/MM/yyyy
  if (y && m && Number(m) >= 1 && Number(m) <= 12) return `${MONTHS[Number(m) - 1]} ${y}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const joinParts = (parts, sep = " · ") => parts.map(clean).filter(Boolean).join(sep);
const splitList = (v) =>
  Array.isArray(v)
    ? v.map(clean).filter(Boolean)
    : clean(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

/* ── Fetch everything the PDF needs (in parallel, failures tolerated) ─── */
async function loadProfileData() {
  const calls = {
    basic: candidateApi.get("/candidate/profile/specific-details"),
    skills: candidateApi.get("/candidates/get-key-skills"),
    employment: candidateApi.get("/candidates/get-employment"),
    education: candidateApi.get("/candidates/get-education"),
    certifications: candidateApi.get("/certifications"),
    personal: candidateApi.get("/candidates/get-personal-details"),
  };
  const keys = Object.keys(calls);
  const results = await Promise.allSettled(Object.values(calls));
  const out = {};
  results.forEach((r, i) => {
    out[keys[i]] = r.status === "fulfilled" ? unwrap(r.value) : null;
    if (r.status === "rejected") console.warn(`Profile PDF: couldn't load ${keys[i]}`, r.reason);
  });
  return out;
}

/* ── PDF writer with automatic page breaks ────────────────────────────── */
function createWriter() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const contentWidth = width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  const ensureSpace = (needed) => {
    if (y + needed > height - PAGE_MARGIN - FOOTER_SPACE) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const text = (value, { size = 10.5, style = "normal", color = INK, gap = 4, indent = 0 } = {}) => {
    const v = pdfSafe(value);
    if (!v) return;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lineHeight = size * 1.35;
    const lines = doc.splitTextToSize(v, contentWidth - indent);
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, PAGE_MARGIN + indent, y + size);
      y += lineHeight;
    });
    y += gap;
  };

  /* Title on the left, a muted date range on the right (same line) */
  const titleWithDates = (title, dates) => {
    const t = pdfSafe(title);
    const d = pdfSafe(dates);
    const size = 11.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const dateWidth = d ? doc.getTextWidth(d) + 12 : 0;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(t || " ", contentWidth - dateWidth);
    ensureSpace(size * 1.35 * lines.length);
    lines.forEach((line, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(...INK);
      doc.text(line, PAGE_MARGIN, y + size);
      if (i === 0 && d) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...MUTED);
        doc.text(d, PAGE_MARGIN + contentWidth, y + size, { align: "right" });
      }
      y += size * 1.35;
    });
    y += 1;
  };

  const sectionTitle = (title) => {
    ensureSpace(40);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text(pdfSafe(title).toUpperCase(), PAGE_MARGIN, y + 10, { charSpace: 0.8 });
    y += 16;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.8);
    doc.line(PAGE_MARGIN, y, PAGE_MARGIN + contentWidth, y);
    y += 10;
  };

  const space = (h) => {
    y += h;
  };

  const footer = (label) => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(pdfSafe(label), PAGE_MARGIN, height - PAGE_MARGIN / 2 - 4);
      doc.text(`Page ${i} of ${pages}`, width - PAGE_MARGIN, height - PAGE_MARGIN / 2 - 4, {
        align: "right",
      });
    }
  };

  return { doc, text, titleWithDates, sectionTitle, space, footer, contentWidth };
}

/* ── Build the PDF from the loaded data ───────────────────────────────── */
export function buildProfilePdf(data) {
  const basic = asObject(data.basic);
  const personal = asObject(data.personal);
  const skillsData = asObject(data.skills);
  const employment = asArray(data.employment, "employment");
  const education = asArray(data.education, "education");
  const certifications = asArray(data.certifications, "certifications");

  const w = createWriter();
  const { doc } = w;

  /* Header */
  const name = clean(basic.full_name) || "Candidate profile";
  const headline = joinParts(
    [basic.designation, basic.company_name && `at ${basic.company_name}`],
    " "
  );
  const location = joinParts([basic.city || personal.city, basic.country || personal.country], ", ");
  const contact = joinParts([
    basic.email_id || basic.email,
    basic.phone_number,
    location,
    personal.linkedin_url,
  ]);

  w.text(name, { size: 22, style: "bold", gap: 2 });
  if (headline) w.text(headline, { size: 12, color: TEAL, gap: 2 });
  if (contact) w.text(contact, { size: 9.5, color: MUTED, gap: 2 });
  const experience = joinParts([
    basic.total_experience && `Total experience: ${basic.total_experience}`,
  ]);
  if (experience) w.text(experience, { size: 9.5, color: MUTED, gap: 2 });

  /* Summary */
  const summary = clean(basic.summary || skillsData.summary);
  if (summary) {
    w.sectionTitle("Summary");
    w.text(summary, { size: 10.5, gap: 2 });
  }

  /* Key skills */
  const skills = splitList(skillsData.key_skills);
  if (skills.length) {
    w.sectionTitle("Key skills");
    w.text(skills.join("  ·  "), { size: 10.5, gap: 2 });
  }

  /* Experience — newest first */
  const jobs = [...employment].sort((a, b) => {
    const da = new Date(String(a.joining_date || "").replace(/\//g, "-")).getTime() || 0;
    const db = new Date(String(b.joining_date || "").replace(/\//g, "-")).getTime() || 0;
    return db - da;
  });
  if (jobs.length) {
    w.sectionTitle("Experience");
    jobs.forEach((job, i) => {
      const start = monthYear(job.joining_date);
      const end = job.is_current ? "Present" : monthYear(job.end_date);
      w.titleWithDates(clean(job.job_title) || "Role", joinParts([start, end], " - "));
      const sub = joinParts([
        job.company_name,
        joinParts([job.location, job.country], ", "),
        job.duration,
      ]);
      if (sub) w.text(sub, { size: 10, color: TEAL, gap: 3 });
      if (clean(job.key_responsibilities)) w.text(job.key_responsibilities, { size: 10, gap: 3 });
      const used = splitList(job.skills_used);
      if (used.length) w.text(`Skills: ${used.join(", ")}`, { size: 9.5, color: MUTED, gap: 3 });
      if (i < jobs.length - 1) w.space(6);
    });
  }

  /* Education */
  if (education.length) {
    w.sectionTitle("Education");
    education.forEach((ed, i) => {
      const title = joinParts([ed.course || ed.education_level, ed.specialization], " - ");
      w.titleWithDates(title || "Education", joinParts([ed.start_year, ed.end_year], " - "));
      const grade = clean(ed.marks) ? joinParts([ed.grading_system, ed.marks], ": ") : "";
      const sub = joinParts([ed.university, ed.course_type, grade]);
      if (sub) w.text(sub, { size: 10, color: TEAL, gap: 3 });
      if (i < education.length - 1) w.space(4);
    });
  }

  /* Certifications */
  if (certifications.length) {
    w.sectionTitle("Certifications");
    certifications.forEach((c) => {
      const certName = clean(c.certifications || c.certification_name) || "Certification";
      const issued = monthYear(c.certificate_issue_date);
      const expires = monthYear(c.certificate_expire_date);
      const dates = joinParts([issued && `Issued ${issued}`, expires && `Expires ${expires}`]);
      w.titleWithDates(certName, dates);
      if (clean(c.certification_issued_by)) w.text(c.certification_issued_by, { size: 10, color: TEAL, gap: 4 });
    });
  }

  /* Languages */
  const languages = splitList(personal.languages_known);
  if (languages.length) {
    w.sectionTitle("Languages");
    w.text(languages.join(", "), { size: 10.5, gap: 2 });
  }

  const today = new Date();
  w.footer(`Generated from Ri8fit on ${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`);

  const fileName = `${
    pdfSafe(name)
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "") || "Candidate"
  }_Ri8fit_Profile.pdf`;

  return { doc, fileName };
}

/* ── Fetch + build + download ─────────────────────────────────────────── */
export async function downloadProfilePdf() {
  const data = await loadProfileData();
  if (!data.basic && !data.employment && !data.skills) {
    throw new Error("Couldn't load your profile. Please try again.");
  }
  const { doc, fileName } = buildProfilePdf(data);
  doc.save(fileName);
  return fileName;
}