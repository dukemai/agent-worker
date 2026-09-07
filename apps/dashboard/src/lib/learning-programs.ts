export function advanceProgram(program: { current_day: number; total_days: number }): { current_day: number; status: "active" | "completed" } {
  return program.current_day >= program.total_days
    ? { current_day: program.current_day, status: "completed" }
    : { current_day: program.current_day + 1, status: "active" };
}
