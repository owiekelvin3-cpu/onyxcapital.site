export async function requestAuthEmail(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; created?: boolean };
  return { ok: res.ok, error: json.error, created: Boolean(json.created) };
}
