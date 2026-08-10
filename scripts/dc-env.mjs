// Shared helpers for the Data Center setup and local E2E scripts.
// Loads .env.dc (if present) without overriding variables already in the
// environment, and provides a minimal authenticated REST client.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadDcEnv() {
  const file = join(root, ".env.dc");
  if (!existsSync(file)) return false;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

export const ALL_PRODUCTS = ["jira", "confluence", "bitbucket"];

// CLI arguments win over ATLASSIAN_PRODUCTS. E2E callers require one product.
//   pnpm dc:setup jira
//   ATLASSIAN_PRODUCTS=jira node scripts/e2e-prepare.mjs
export function selectedProducts(args = []) {
  const fromArgs = args.filter((arg) => !arg.startsWith("-"));
  const raw =
    fromArgs.length > 0
      ? fromArgs
      : (process.env.ATLASSIAN_PRODUCTS ?? "")
          .split(",")
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean);
  if (raw.length === 0) return [...ALL_PRODUCTS];
  const invalid = raw.filter((product) => !ALL_PRODUCTS.includes(product));
  if (invalid.length > 0) {
    throw new Error(
      `Unknown product(s): ${invalid.join(", ")} ` +
        `(expected a subset of ${ALL_PRODUCTS.join(", ")})`
    );
  }
  return raw;
}

export function productUrls() {
  return {
    jira: process.env.JIRA_URL ?? "http://localhost:8080",
    confluence: process.env.CONFLUENCE_URL ?? "http://localhost:8090",
    bitbucket: process.env.BITBUCKET_URL ?? "http://localhost:7990"
  };
}

// Auth for setup/E2E fixtures: a product PAT (<PRODUCT>_TOKEN) wins over
// admin Basic credentials. Jira 11 disables Basic authentication by default,
// so a PAT is the reliable choice there. forceBasic skips the PAT (used when
// an admin-only endpoint rejects a scoped PAT with 401/403).
export function adminAuth(product, forceBasic = false) {
  if (product && !forceBasic) {
    const token = process.env[`${product.toUpperCase()}_TOKEN`]?.trim();
    if (token) return `Bearer ${token}`;
  }
  const username =
    process.env.ATLASSIAN_ADMIN_USERNAME?.trim() || process.env.ATLASSIAN_USERNAME?.trim();
  const password = process.env.ATLASSIAN_ADMIN_PASSWORD || process.env.ATLASSIAN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "Provide a PAT in <PRODUCT>_TOKEN (e.g. JIRA_TOKEN) or set " +
        "ATLASSIAN_ADMIN_USERNAME/ATLASSIAN_ADMIN_PASSWORD in .env.dc " +
        "(the admin account from the setup wizard)"
    );
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export async function request(
  baseUrl,
  path,
  {
    method = "GET",
    body,
    query,
    product,
    contentType = "application/json",
    accept = "application/json",
    forceBasic = false
  } = {}
) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const send = async (authorization) => {
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          authorization,
          accept,
          ...(body !== undefined ? { "content-type": contentType } : {})
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (error) {
      throw new Error(
        `Cannot reach ${baseUrl} (${error?.cause?.code ?? error?.message ?? error}).\n` +
          `Hint: start only this product with \`node scripts/e2e.mjs ${product ?? "jira"} up\`, ` +
          "finish the setup wizard in the browser, then run `pnpm dc:setup`.",
        { cause: error }
      );
    }
    return response;
  };

  let response = await send(adminAuth(product, forceBasic));
  // Scoped PATs can lack admin permission (including read-only admin lookups):
  // retry with admin Basic when the PAT is rejected.
  const patUsed = product && !forceBasic && process.env[`${product.toUpperCase()}_TOKEN`]?.trim();
  const hasBasic =
    (process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME) &&
    (process.env.ATLASSIAN_ADMIN_PASSWORD || process.env.ATLASSIAN_PASSWORD);
  if (patUsed && hasBasic && (response.status === 401 || response.status === 403)) {
    response = await send(adminAuth(product, true));
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  return { status: response.status, ok: response.ok, data, text };
}

export async function requestOk(baseUrl, path, options = {}) {
  const result = await request(baseUrl, path, options);
  if (!result.ok) {
    const snippet = (result.text ?? "").slice(0, 300);
    const basicDisabled =
      result.status === 403 && snippet.includes("Basic Authentication has been disabled");
    throw new Error(
      `${options.method ?? "GET"} ${baseUrl}${path} failed with ` +
        `HTTP ${result.status}${snippet ? `: ${snippet}` : ""}\n` +
        (basicDisabled
          ? "Hint: this instance has Basic authentication disabled (Jira 11 " +
            "default). Create a Personal Access Token in the product UI " +
            "(Profile -> Personal Access Tokens) and set it in .env.dc " +
            "(e.g. JIRA_TOKEN), or re-enable Basic auth under " +
            "Administration -> System -> Basic authentication."
          : "Hint: run the setup wizard in the browser first, refresh the " +
            "license with `pnpm dc:setup`, and check the admin credentials.")
    );
  }
  return result.data;
}

// ── License management ──
// Timebomb license keys from
// https://developer.atlassian.com/platform/marketplace/timebomb-licenses-for-testing-server-apps/
// Re-applying a still-valid key extends the window by 3 hours. An expired key
// is rejected by the same instance and requires a `docker compose down -v`
// rebuild.

export const TIMEBOMB_LICENSES = {
  jira: "AAAB8w0ODAoPeNp9Uk2P2jAQvedXWOoNydmELVKLFKlL4u7SLglKQj+27cEkA3gb7GjssMu/rwnQls9DDvHMvPfmvXmTN0BGfE08n3jdftfv927J/SgnXc9/58wRQC5UXQO6j6IAqYGVwgglAxbnLB2nw4w5cbOcAiaziQbUge85oZKGFybmSwjKmiMKvfjATcW1Fly6hVo64waLBdcQcQPBhot6Per5zo4lX9fQjofJaMTScHj3uC+x11rgup0b3z7sudiIi+oSWQa4AhxGweD+fU6/Tb68pZ+fnh7owPO/Os8CuVujKpvCuJsfqtXMvHAE1+KKFQQGG3A+2cp412XJeQjSHLVkzVQXKOrWn/bljH/nNmslXPa30+nESU4/Jikdp0k0CfNhEtNJxmwhCBGsFSWZrolZANmhECYLVQISu9gzFIb8WBhT/+zf3MyVe2DOTbWdoLCd+OWSSBGpDCmFNiimjQGLLDQxihSNNmppU3Yd67c0ILksjhOxqsKU3eUsooPvG4kXUrli/MlF7dayEU7kb6lepJOxOLAf7XneFmkfCuCp95nh+LdwhfegL8E5l0LzNo4IVlApi0Vy0GZvs9O6b+vHZxzBv0toB3Yuk5lCwuualHs8fSD0/3NqdZ48nBd+5bjYilfNdokZr6zmP7TmY5YwLAIUNq8MbmR8GfaV9ulfLz1K+3g9j1YCFDeq7aYROMQbwMIvHimNt7/bJCCIX02nj",
  confluence:
    "AAABtQ0ODAoPeNp9kV9v0zAUxd/9Ka7EWyWnTmESqxSJNQlbxdJUTbLBgAfXuV0NqR3ZTqHfHjdpYVSCB7/4/jm/e86rR6wh4wdgE2Bsyq6nLITbrIQJC9+SRbdbo8k3lUVjo5CRWCvHhVvwHUZ1y42RdvuOu4ZbK7kKhN4RodUm8D1yj5EzHZJlZ8SWW0y4w+i4lrIrykJyLwUqi+WhxX5fnGdZuornN/fnUvqzlebQzy1f353F04zL5l/qBZo9mnkSzW6vS/qxenhDPzw93dEZCx8HtBeyLyX7mpfiMSqHZkAvurUVRrZOajX8jEajRV7S9/mKLld5UsXlPF/Qqkh9IYoNetYa1gdwW4STEqRK6BoNtEZ/Q+Hg89a59st0PH7WwV/042aYoDhMfA0g0aC0g1paZ+S6c+g3SwtOg+is0zufS0C8IZ5ZcSUuLfNU8Sq9KdOEzj4dEf8XWuG4+X36Cd47WanvSv9QpEgXkX/0ijGSm2eupOW9MQnusdGtv7BE685nk94NX7/M/TKFy/BPJjz4047bJyTBPyH0CqcO2GgDvG2hPgNYku550w1YG954il/X0fxXMC0CFQCRUd9kwqDYeFIFJyQmlQPeMMYDLQIUYpH3kyyXea6e1PzAN2rpSuuUl4M=X02l1",
  bitbucket:
    "AAABrQ0ODAoPeNp9kVFvmzAQx9/9KSztLZIJZIu0RkJqA6yNViAK0G3d+uDApXgjNrKPbPn2dYG0a6fuwS8+393v//O7vAMa8yN1PerOFrPZYn5GL+OczlzvI0m6/RZ0uisMaON7LgmURF5iwvfgVy3XWpj6nGPDjRFcOqXaE4Pc1M61KEEayI8t9I+DNI6jTbC6uP73wd/FdafLmhsIOYL/yMDcOXM98p95Yyn60wp97PvW769OpFHMRfMWagb6AHoV+svLs5x9LW4+sM+3t1ds6XpfRkw7jwcgEbSPugOSdVtTatGiUHK4mUwmSZqzT+mGrTdpWAT5Kk1YkUW24AcaLFBFt0eKNdARlUayVBVo2mr1E0qk32vE9sdiOr1XzgvEaTN0MBg67hwaKioV0koY1GLbIdjJwlBUtOwMqr39KYfY1JZZclm+9jLEsmbEAZ4CBJvoIo9Ctvz2CP2GrRHe6irkL6l+S5JFiW8Pm7suSfU9l8LwXkwIB2hUaxPmYPAUm/Q2bP315w5MGXL95DmEZ839jFEE3SlNedvS6rTCkOjAm25YvOON3fMAVTj4nTAtAhRH4o+fI5MQ7xSh2mtA1bPJrq0WAgIVAIGperR8m2N0fl/GfUUJfQnd+T1aX02kk"
};

const LICENSE_SPECS = {
  jira: {
    method: "POST",
    path: "/rest/plugins/applications/1.0/installed/jira-software/license",
    contentType: "application/vnd.atl.plugins+json",
    accept: "application/vnd.atl.plugins+json",
    body: (key) => ({ licenseKey: key })
  },
  bitbucket: {
    method: "POST",
    path: "/rest/api/1.0/admin/license",
    body: (key) => ({ license: key })
  }
};

export async function applyLicense(product) {
  const spec = LICENSE_SPECS[product];
  if (!spec) throw new Error(`No license spec for product: ${product}`);
  const baseUrl = productUrls()[product];
  const attempt = (forceBasic) =>
    request(baseUrl, spec.path, {
      method: spec.method,
      body: spec.body(TIMEBOMB_LICENSES[product]),
      product,
      forceBasic,
      ...(spec.contentType ? { contentType: spec.contentType } : {}),
      ...(spec.accept ? { accept: spec.accept } : {})
    });
  let result = await attempt(false);
  // Scoped PATs (Bitbucket) lack SYS_ADMIN: retry with admin Basic.
  if (
    (result.status === 401 || result.status === 403) &&
    process.env[`${product.toUpperCase()}_TOKEN`]
  ) {
    process.stdout.write(
      `[license] ${product}: PAT rejected for the admin endpoint, ` +
        "retrying with admin Basic credentials\n"
    );
    result = await attempt(true);
  }
  if (!result.ok) {
    const snippet = (result.text ?? "").slice(0, 300);
    const basicDisabled =
      result.status === 403 && snippet.includes("Basic Authentication has been disabled");
    throw new Error(
      `Failed to apply the ${product} timebomb license ` +
        `(HTTP ${result.status}): ${snippet}\n` +
        (basicDisabled
          ? "Hint: this instance has Basic authentication disabled (Jira 11 " +
            "default). Create a Personal Access Token in the product UI " +
            "(Profile -> Personal Access Tokens), set it as " +
            `${product.toUpperCase()}_TOKEN in .env.dc, and re-run.`
          : "Hint: finish the setup wizard in the browser first and make sure " +
            "the credentials in .env.dc match the admin account created there " +
            "(<PRODUCT>_TOKEN or ATLASSIAN_ADMIN_USERNAME/PASSWORD).")
    );
  }
  process.stdout.write(`[license] ${product} license refreshed (expires in 3h)\n`);
}

/**
 * Pre-flight license check for E2E runs. Re-applies the timebomb license
 * to get a fresh 3-hour window. If the key has expired beyond the re-apply
 * window, fails immediately with clear recovery instructions — trading a
 * 30-second failure for a 40-minute one.
 */
export async function ensureLicense(product) {
  const baseUrl = productUrls()[product];
  if (product === "confluence") {
    process.stdout.write(
      `[e2e] confluence: no public license REST endpoint. ` +
        "If the license has expired, refresh it manually:\n" +
        `  ${baseUrl} -> gear icon -> General Configuration -> ` +
        "License Details -> paste the Confluence Data Center timebomb key from\n" +
        "  https://developer.atlassian.com/platform/marketplace/timebomb-licenses-for-testing-server-apps/\n"
    );
    return;
  }
  if (!LICENSE_SPECS[product]) {
    process.stdout.write(`[e2e] ${product}: no license spec — skipping license check\n`);
    return;
  }
  try {
    await applyLicense(product);
  } catch (error) {
    const msg = error?.message ?? String(error);
    throw new Error(
      `${product} license is expired and cannot be renewed on this instance.\n` +
        `The timebomb key has exceeded its valid window for this instance.\n` +
        `Fix: docker compose --profile ${product} down -v && ` +
        `docker compose --profile ${product} up -d ${product} && ` +
        `pnpm dc:setup ${product}\n` +
        `Original error: ${msg}`,
      { cause: error }
    );
  }
}
