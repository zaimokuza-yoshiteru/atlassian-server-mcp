import { McpServer } from "@modelcontextprotocol/server";
import type { AtlassianService } from "./service.js";
import { registerTools } from "./tools.js";
import { VERSION } from "./version.js";

export function createAtlassianMcpServer(service: AtlassianService): McpServer {
  const server = new McpServer(
    {
      name: "atlassian-server-mcp",
      version: VERSION
    },
    {
      instructions:
        "First use atlassian_discover_operations or atlassian_describe_operation. The exposure tier and FORCE include/exclude patterns control visibility; annotations are client hints, not a security boundary. Before mutations, read the product metadata and required fields. After a timeout or 5xx response, do not blindly replay a write because its upstream outcome may be unknown."
    }
  );
  registerTools(server, service);
  return server;
}
