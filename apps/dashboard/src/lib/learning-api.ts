import type { LearningProgram, LearningProgramStatus } from "@/types/database";
async function request<T>(path = "", options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/learning/programs${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Learning request failed");
  return data as T;
}
const json = (method: string, payload: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
export const fetchLearningPrograms = () => request<{ programs: LearningProgram[] }>();
export const fetchLearningProgram = (id: string) => request<{ program: LearningProgram }>(`/${id}`);
export const importLearningProgram = (payload: unknown) => request<{ program: LearningProgram; days_imported: number }>("/import", json("POST", payload));
export const updateLearningProgramStatus = (id: string, status: Exclude<LearningProgramStatus, "completed">) => request<{ program: LearningProgram }>(`/${id}`, json("PATCH", { status }));
export const advanceLearningProgram = (id: string, current_day?: number) => request<{ program: LearningProgram }>(`/${id}/advance`, json("POST", { current_day }));
export const deleteLearningProgram = (id: string) => request<{ success: boolean }>(`/${id}`, { method: "DELETE" });
