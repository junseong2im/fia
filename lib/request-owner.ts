const USER_EMAIL_HEADER = "oai-authenticated-user-email";

export async function getRequestOwnerId(request: Request) {
  const identity = request.headers.get(USER_EMAIL_HEADER)?.trim().toLowerCase() || "demo@fia.local";
  const bytes = new TextEncoder().encode(`fia-owner:${identity}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
