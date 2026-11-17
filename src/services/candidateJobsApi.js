// candidateJobsApi.js
//
// Same axiosBaseQuery-over-candidateApi pattern as candidateGapAnalysisApi.js
// (see that file's header comment for why: reuses your interceptor's auth
// header + 401 refresh-retry logic instead of duplicating it).
//
// Endpoints:
//   GET  /candidate/matched-jobs/bycountry?country=<c>      → Relevant Jobs list
//   POST /candidates/jobs/apply        { job_id }            → apply to a job (201)
//   GET  /candidates/jobs/applied?page=&page_size=&stage=   → the candidate's applications

import { createApi } from "@reduxjs/toolkit/query/react";
import candidateApi from "./candidateApi"; // adjust to match this file's actual location relative to services/candidateApi.js

const axiosBaseQuery =
  (axiosInstance) =>
  async ({ url, method = "GET", data, params }) => {
    try {
      const result = await axiosInstance({ url, method, data, params });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError;
      return {
        error: {
          status: err?.response?.status,
          data: err?.response?.data || err?.message || "Request failed",
        },
      };
    }
  };

export const candidateJobsApi = createApi({
  reducerPath: "candidateJobsApi",
  baseQuery: axiosBaseQuery(candidateApi),
  tagTypes: ["MatchedJobs", "AppliedJobs"],
  endpoints: (builder) => ({
    // country is passed lowercase to match the curl example (?country=india)
    getMatchedJobsByCountry: builder.query({
      query: ({ country, minScore = 60 } = {}) => ({
        url: "/candidate/matched-jobs/bycountry",
        method: "GET",
        params: {
          country: (country || "").toLowerCase(),
          // min_score: minScore,
        },
      }),
      providesTags: ["MatchedJobs"],
    }),

    // Apply to one job. Response: { message, job_matched_candidate_id, job_id,
    // candidate_id, status, source, match_score, applied_at }
    applyToJob: builder.mutation({
      query: (jobId) => ({
        url: "/candidates/jobs/apply",
        method: "POST",
        data: { job_id: jobId },
      }),
      invalidatesTags: ["AppliedJobs"],
    }),

    // The candidate's applications. Response: { total, page, page_size,
    // is_application_locked, lock_reason, items: [ { application_id, job_id,
    // job_title, company_name, city, country, mode_of_work, job_type, job_status,
    // job_is_open, stage, stage_label, applied_at, stage_updated_at,
    // is_blocked, blocked_reason } ] }
    getAppliedJobs: builder.query({
      query: ({ page = 1, pageSize = 100, stage } = {}) => ({
        url: "/candidates/jobs/applied",
        method: "GET",
        params: { page, page_size: pageSize, ...(stage ? { stage } : {}) },
      }),
      providesTags: ["AppliedJobs"],
    }),
  }),
});

export const {
  useGetMatchedJobsByCountryQuery,
  useLazyGetMatchedJobsByCountryQuery,
  useApplyToJobMutation,
  useGetAppliedJobsQuery,
} = candidateJobsApi;

export default candidateJobsApi;

/* ── Register with your store (only needed if this stays standalone) ──
import { candidateJobsApi } from ".../candidateJobsApi";

export const store = configureStore({
  reducer: {
    ...otherReducers,
    [candidateJobsApi.reducerPath]: candidateJobsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(...yourExistingApiMiddlewares) // whatever you already concat
      .concat(candidateJobsApi.middleware),
});

Same caveat as candidateGapAnalysisApi.js: if CandidatePortalApis.js is also
built on an axiosBaseQuery wrapping this same candidateApi instance, prefer
adding getMatchedJobsByCountry as an injected endpoint there instead — one
shared cache, and this store.js file doesn't need to change at all.
*/