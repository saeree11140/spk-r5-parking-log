const CSRF_COOKIE_NAME = "spk_r5_csrf";

export function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";

  const prefix = `${CSRF_COOKIE_NAME}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return "";

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return "";
  }
}
