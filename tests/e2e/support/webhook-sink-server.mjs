// Minimal HTTP server that records every incoming request so that E2E tests
// can assert webhook delivery (Bitbucket webhooks, etc.).
//
// Deployed as a compose sidecar: the product container POSTs webhooks to this
// server by its service name; tests query the recorded payloads through the
// mapped host port.
//
// Endpoints:
//   GET  /_list   → JSON array of recorded requests
//   POST /_clear  → empty the recording
//   *             → record the request, return 200

import { createServer } from "node:http";

const PORT = 8026;
const requests = [];

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/_list") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(requests));
    return;
  }
  if (req.method === "POST" && req.url === "/_clear") {
    requests.length = 0;
    res.writeHead(200);
    res.end("ok");
    return;
  }

  // Record any other request as a webhook delivery.
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key] = value;
    }
    requests.push({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.url,
      headers,
      body: body.slice(0, 65536) // 64 KiB cap per payload
    });
    res.writeHead(200);
    res.end("ok");
  });
});

server.listen(PORT, () => {
  process.stdout.write(`[webhook-sink] listening on :${PORT}\n`);
});
