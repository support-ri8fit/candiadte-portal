// src/components/QrJobPrompt.jsx
//
// Finishes a job QR-code visit once the candidate is inside the portal.
// Rendered once in CandidateLayout, so it runs for BOTH:
//   • an existing candidate who scanned the QR and signed in, and
//   • a new candidate who registered from the QR.
//
// Instead of a small popup it opens the FULL Job Details page for that job,
// so the candidate reads the description / skills and decides:
//   • not applied yet → Job Details with "Apply now"
//   • already applied (e.g. registration with job_id applied them) →
//     Job Details showing "✓ Applied" + a toast
// Nothing is applied automatically from here.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useGetAppliedJobsQuery } from "../services/candidateJobsApi";
import { getQrJobId, clearQrJobId } from "../utils/qrJob";

export default function QrJobPrompt() {
  const navigate = useNavigate();
  const [jobId] = useState(() => getQrJobId());
  const handled = useRef(false);

  // Needed only to know whether this job is already applied
  const applied = useGetAppliedJobsQuery({ page: 1, pageSize: 100 }, { skip: !jobId });

  useEffect(() => {
    if (!jobId || handled.current || applied.isLoading || applied.isFetching) return;
    handled.current = true;

    const data = applied.data?.items ? applied.data : applied.data?.data;
    const application = (data?.items || []).find((i) => String(i.job_id) === String(jobId)) || null;

    // The QR has done its job — don't open it again on the next page load
    clearQrJobId();

    if (application) {
      toast.success(`Your application for "${application.job_title || "this job"}" is submitted`);
    }

    const tab = application ? "applications" : "relevant";
    navigate(`/for-candidate/requisitions?tab=${tab}&job=${encodeURIComponent(jobId)}`, {
      state: { tab, jobId, application, fromQr: true },
    });
  }, [jobId, applied.isLoading, applied.isFetching, applied.data, navigate]);

  return null;
}