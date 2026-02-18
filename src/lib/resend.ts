const RESEND_API_URL = "https://api.resend.com/emails";

export interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(apiKey: string, payload: EmailPayload): Promise<void> {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend API error ${response.status}: ${text}`);
  }
}
