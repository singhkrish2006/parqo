import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function origin(value: string | undefined): string | null {
  try {
    return value ? new URL(value.replace(/\{[^}]+\}/g, "0")).origin : null;
  } catch {
    return null;
  }
}

const supabaseOrigin = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseSocket = supabaseOrigin?.replace(/^http/, "ws");
const tileOrigin = origin(process.env.NEXT_PUBLIC_MAP_TILE_URL);

// Next injects inline bootstrap scripts, so script-src needs 'unsafe-inline'
// without a per-request nonce; dev tooling additionally needs 'unsafe-eval'.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Map tiles come from whichever provider is configured (or the dev default).
  `img-src 'self' data: blob: https://services.arcgisonline.com${tileOrigin ? ` ${tileOrigin}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseSocket}` : ""}${isDev ? " ws: http:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Leaflet's map container can't survive React StrictMode's dev-only
  // double-mount (it throws "Map container is being reused").
  reactStrictMode: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      {
        // A stale service worker would pin users to old code.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
