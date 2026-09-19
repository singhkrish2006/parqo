import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 44,
          fontWeight: 700,
          borderRadius: 14,
        }}
      >
        P
        <span style={{ color: "#b6ff3a" }}>.</span>
      </div>
    ),
    size,
  );
}
