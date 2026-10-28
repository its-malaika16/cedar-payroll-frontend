const PRODUCTION_API_URL =
  "https://ce-02dc817760904e6e828bb2e4bded5326.ecs.eu-central-1.on.aws";

const SUBMITTED_EMAILS_KEY = "cedar_website_enquiry_emails";

function apiUrl() {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000";
  }
  return PRODUCTION_API_URL;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function readSubmittedEmails() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(SUBMITTED_EMAILS_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function hasSubmittedWebsiteEnquiry(email) {
  const key = normalizeEmail(email);
  if (!key) return false;
  return readSubmittedEmails().includes(key);
}

export function rememberSubmittedWebsiteEnquiry(email) {
  const key = normalizeEmail(email);
  if (!key || typeof window === "undefined") return;
  const list = readSubmittedEmails();
  if (list.includes(key)) return;
  try {
    window.localStorage.setItem(SUBMITTED_EMAILS_KEY, JSON.stringify([...list, key]));
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}

export async function submitWebsiteEnquiry(formData) {
  if (hasSubmittedWebsiteEnquiry(formData?.email)) {
    return { success: true, alreadySubmitted: true };
  }

  const response = await fetch(`${apiUrl()}/onboarding/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Something went wrong.");
  }
  rememberSubmittedWebsiteEnquiry(formData?.email);
  return result;
}
