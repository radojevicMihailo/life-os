// Read-only timing probe. Use an already-running disposable/local application.
// LIFE_OS_MEASURE_URL=http://127.0.0.1:3210 LIFE_OS_MEASURE_PASSWORD=... node scripts/measure-pages.mjs
const origin = new URL(process.env.LIFE_OS_MEASURE_URL ?? "http://127.0.0.1:3210");
if (!["127.0.0.1", "localhost"].includes(origin.hostname)) throw new Error("Measurement is restricted to a local application");
const password = process.env.LIFE_OS_MEASURE_PASSWORD;
if (!password) throw new Error("Set LIFE_OS_MEASURE_PASSWORD for the disposable application");
const login = await fetch(new URL("/api/access/login", origin), {
  method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", origin: origin.origin }, body: new URLSearchParams({ password }),
});
const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
if (!cookie) throw new Error("Could not authenticate the local measurement session");
const routes = ["/", "/tasks", "/notes", "/habits", "/meals", "/finance/investments"];
const output = [];
for (const route of routes) {
  const runs = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const started = performance.now();
    const response = await fetch(new URL(route, origin), { headers: { cookie }, redirect: "manual" });
    const headersMs = performance.now() - started;
    const body = await response.arrayBuffer();
    if (response.status !== 200) throw new Error(`${route}: HTTP ${response.status}`);
    runs.push({ headersMs: Math.round(headersMs), totalMs: Math.round(performance.now() - started), bytes: body.byteLength });
  }
  output.push({ route, cold: runs[0], warm: runs.slice(1) });
}
console.log(JSON.stringify(output, null, 2));
