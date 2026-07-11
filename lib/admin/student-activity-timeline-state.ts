import type { SafeStudentActivity } from "@/lib/admin/student-activity";

export type StudentActivityTimelineState = {
  email: string | null;
  generation: number;
  phase: "loading" | "error" | "ready";
  logs: SafeStudentActivity[];
};

export function getStudentActivityTimelineView(
  state: StudentActivityTimelineState,
  studentEmail: string | null,
): StudentActivityTimelineState {
  if (state.email === studentEmail) return state;

  return {
    email: studentEmail,
    generation: state.generation,
    phase: studentEmail ? "loading" : "ready",
    logs: [],
  };
}

export function isStudentActivityTimelineRequestCurrent(
  state: StudentActivityTimelineState,
  email: string,
  generation: number,
) {
  return state.email === email && state.generation === generation;
}
