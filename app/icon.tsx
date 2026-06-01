import { ImageResponse } from "next/og";

// Branded favicon / tab + home-screen icon (the Dwell sunset ring with a "D").
export const size = { width: 256, height: 256 };
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
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6a7a5f, #c8d1c2, #d2bba0)",
        }}
      >
        <div
          style={{
            width: "80%",
            height: "80%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "#FAF6F0",
            color: "#261E18",
            fontSize: 130,
            fontWeight: 700,
          }}
        >
          D
        </div>
      </div>
    ),
    size
  );
}
