export const config = { runtime: "edge" };

const SUPA_URL = "https://lzfgigiyqpuuxslsygjt.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZmdpZ2l5cXB1dXhzbHN5Z2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDQxNzQ2OSwiZXhwIjoyMDU5OTkzNDY5fQ.B6SMaQNb8tER_vqrqkmjNW2BFjcoIowulQOREtRcD8Q";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json",
};

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Extract key from path: /api/ccq/my-key -> my-key
  const url = new URL(req.url);
  const key = url.pathname.replace(/\/api\/ccq\/?/, "").replace(/^\//, "") ||
               url.searchParams.get("key");

  if (!key) return new Response(JSON.stringify({ error: "key required" }), { status: 400, headers: CORS });

  try {
    // 1. Fetch the CCQ SQL for this key
    const ccqRes = await fetch(
      `${SUPA_URL}/rest/v1/command_centre_queries?key=eq.${encodeURIComponent(key)}&select=sql,return_type&limit=1`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const ccqs = await ccqRes.json();
    if (!ccqs.length) return new Response(JSON.stringify({ error: `CCQ not found: ${key}` }), { status: 404, headers: CORS });

    const { sql, return_type } = ccqs[0];

    // 2. Execute the SQL
    const execRes = await fetch(`${SUPA_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    });
    const result = await execRes.json();
    const rows = result.rows || [];

    // 3. For widget_loader keys: return html string directly
    if (key.startsWith("widget_loader_") && rows[0]?.html) {
      return new Response(JSON.stringify(rows), { headers: CORS });
    }

    return new Response(JSON.stringify(rows), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
