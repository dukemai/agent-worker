import type { Birthday, BirthdayCategory, BirthdayStatus } from "@/types/database";

export async function fetchBirthdays(filters?: { category?: string; status?: BirthdayStatus }): Promise<Birthday[]> {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== "all") params.append("category", filters.category);
  if (filters?.status) params.append("status", filters.status);
  
  const response = await fetch(`/api/birthdays?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch birthdays");
  }
  const json = (await response.json()) as { birthdays: Birthday[] };
  return json.birthdays;
}

export async function createBirthday(data: {
  name: string;
  birthday_month: number;
  birthday_day: number;
  birth_year?: number | null;
  category: BirthdayCategory;
  is_recurring?: boolean;
  wishlist?: string;
  notes?: string;
}): Promise<Birthday> {
  const response = await fetch("/api/birthdays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to create birthday");
  }
  const json = (await response.json()) as { birthday: Birthday };
  return json.birthday;
}

export async function updateBirthday(id: string, data: Partial<Birthday>): Promise<Birthday> {
  const response = await fetch(`/api/birthdays/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update birthday");
  }
  const json = (await response.json()) as { birthday: Birthday };
  return json.birthday;
}

export async function deleteBirthday(id: string): Promise<void> {
  const response = await fetch(`/api/birthdays/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete birthday");
  }
}
