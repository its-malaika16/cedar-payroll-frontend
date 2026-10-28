const PRODUCTION_API_URL =
  "https://ce-02dc817760904e6e828bb2e4bded5326.ecs.eu-central-1.on.aws";

function apiUrl() {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000";
  }
  return PRODUCTION_API_URL;
}

export async function submitWebsiteEnquiry(formData) {
  const response = await fetch(`${apiUrl()}/onboarding/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Something went wrong.");
  }
  return result;
}
