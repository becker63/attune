export async function digest(
  value: string | Uint8Array,
  algorithm = "SHA-256",
) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const result = await crypto.subtle.digest(algorithm, bytes as BufferSource);
  return Array.from(new Uint8Array(result), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
