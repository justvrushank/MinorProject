import { create } from "zustand";
import type { Job, JobStatus, ResultFeature } from "@/types";

interface JobState {
  jobs: Job[];
  activeJobId: string | null;
  addJob: (job: Job) => void;
  updateJobStatus: (id: string, status: JobStatus) => void;
  addResult: (id: string, feature: ResultFeature) => void;
  setActiveJob: (id: string | null) => void;
  setJobs: (jobs: Job[]) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  activeJobId: null,
  addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),
  updateJobStatus: (id, status) =>
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === id ? { ...j, status, updatedAt: new Date().toISOString() } : j,
      ),
    })),
  addResult: (id, feature) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, result: feature } : j)),
    })),
  setActiveJob: (id) => set({ activeJobId: id }),
  setJobs: (jobs) => set({ jobs }),
}));
