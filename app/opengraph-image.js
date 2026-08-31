import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Connect Shield — Hospice Compliance Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadAsset(name) {
  try {
    const buf = await readFile(join(process.cwd(), "public", name));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// Fraunces (site display font) fetched as TTF. Any failure → null → bundled sans.
let frauncesPromise = null;
async function loadFraunces() {
  if (!frauncesPromise) {
    frauncesPromise = (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const css = await fetch(
          "https://fonts.googleapis.com/css2?family=Fraunces:wght@600",
          { signal: controller.signal }
        ).then((r) => r.text());
        const url = css.match(
          /src:\s*url\((.+?)\)\s*format\('(?:truetype|opentype)'\)/
        )?.[1];
        if (!url) {
          clearTimeout(timer);
          return null;
        }
        const buf = await fetch(url, { signal: controller.signal }).then((r) =>
          r.arrayBuffer()
        );
        clearTimeout(timer);
        return buf;
      } catch {
        return null;
      }
    })();
  }
  return frauncesPromise;
}

export default async function Image() {
  const [mark, fraunces] = await Promise.all([
    loadAsset("connect-shield-mark.png"),
    loadFraunces(),
  ]);

  const options = { ...size };
  if (fraunces) {
    options.fonts = [
      { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
    ];
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0E1830 0%, #14213D 58%, #1E2C4E 100%)",
          position: "relative",
        }}
      >
        {/* Gold top rule */}
        <div
          style={{
            display: "flex",
            height: 6,
            width: "100%",
            background: "linear-gradient(90deg, #B8863F 0%, #E8CFA0 55%, #B8863F 100%)",
          }}
        />

        {/* Shield watermark */}
        {mark ? (
          <img
            src={mark}
            width={520}
            height={520}
            style={{
              position: "absolute",
              right: -90,
              bottom: -110,
              opacity: 0.07,
            }}
          />
        ) : null}

        {/* Main block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
            padding: "0 96px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
            {mark ? (
              <img src={mark} width={118} height={118} style={{ borderRadius: 28 }} />
            ) : null}
            <div
              style={{
                display: "flex",
                fontFamily: "Fraunces",
                fontSize: 86,
                fontWeight: 600,
                color: "#F7F0E1",
                letterSpacing: -1,
              }}
            >
              Connect Shield
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 64,
              height: 4,
              background: "#B8863F",
              marginTop: 40,
              marginBottom: 28,
            }}
          />

          <div
            style={{
              display: "flex",
              fontSize: 29,
              fontWeight: 600,
              color: "#E8CFA0",
              letterSpacing: 7,
              textTransform: "uppercase",
            }}
          >
            Hospice Compliance Intelligence
          </div>
        </div>

        {/* Footer data row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 96px 54px",
            fontSize: 24,
            color: "#93A0B8",
          }}
        >
          <div style={{ display: "flex" }}>SSVI 0–16 scale</div>
          <div style={{ display: "flex", color: "#B8863F" }}>•</div>
          <div style={{ display: "flex" }}>Nine claims-based measures</div>
          <div style={{ display: "flex", color: "#B8863F" }}>•</div>
          <div style={{ display: "flex" }}>Zero PHI stored</div>
        </div>
      </div>
    ),
    options
  );
}
