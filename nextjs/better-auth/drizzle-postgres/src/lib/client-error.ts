export function clientErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return fallback;
}
