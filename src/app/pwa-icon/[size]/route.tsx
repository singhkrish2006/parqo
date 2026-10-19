import { ImageResponse } from "next/og";

const ALLOWED = new Set([192, 512]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const size = Number((await params).size);
  if (!ALLOWED.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          color: "#f2f2f2",
          // Keeps the mark inside the maskable safe zone.
          fontSize: size * 0.5,
          fontWeight: 700,
        }}
      >
        P
        <span style={{ color: "#b6ff3a" }}>.</span>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
