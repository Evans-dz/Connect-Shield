import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { supabasePublic, riskFromScore } from "@/lib/supabase";

export const runtime = "nodejs";
export const alt = "Hospice SSVI score card — Connect Shield";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RISK_HEX = { low: "#2E9E62", mid: "#C98A1F", high: "#D14343" };

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

async function getAgency(slug) {
  try {
    const db = supabasePublic();
    if (!db || !slug) return null;
    const query = db
      .from("ssvi_public")
      .select("hospice_name, city, state, ccn, fy2025_total_ssvi")
      .eq("slug", slug)
      .maybeSingle();
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ data: null }), 2500)
    );
    const { data } = await Promise.race([query, timeout]);
    if (!data || data.fy2025_total_ssvi == null) return null;
    return data;
  } catch {
    return null;
  }
}

const shell = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "linear-gradient(135deg, #0E1830 0%, #14213D 58%, #1E2C4E 100%)",
  position: "relative",
};

const goldRule = {
  display: "flex",
  height: 6,
  width: "100%",
  background: "linear-gradient(90deg, #B8863F 0%, #E8CFA0 55%, #B8863F 100%)",
};

// Same branded card as app/opengraph-image.js — the guaranteed fallback.
function DefaultCard({ mark }) {
  return (
    <div style={shell}>
      <div style={goldRule} />
      {mark ? (
        <img
          src={mark}
          width={520}
          height={520}
          style={{ position: "absolute", right: -90, bottom: -110, opacity: 0.07 }}
        />
      ) : null}
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
  );
}

function AgencyCard({ agency, mark }) {
  const score = Number(agency.fy2025_total_ssvi);
  const risk = riskFromScore(score);
  const riskColor = RISK_HEX[risk.tone] || RISK_HEX.mid;
  const name = agency.hospice_name || "Medicare-certified hospice";
  const where = [agency.city, agency.state].filter(Boolean).join(", ");
  const nameSize = name.length > 46 ? 46 : name.length > 30 ? 56 : 66;
  const barPct = Math.max(2, Math.min(100, (score / 16) * 100));

  return (
    <div style={shell}>
      <div style={goldRule} />

      {/* Header: brand + context */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "42px 80px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {mark ? (
            <img src={mark} width={54} height={54} style={{ borderRadius: 13 }} />
          ) : null}
          <div
            style={{
              display: "flex",
              fontFamily: "Fraunces",
              fontSize: 30,
              fontWeight: 600,
              color: "#F7F0E1",
            }}
          >
            Connect Shield
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 21,
            color: "#93A0B8",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          FY2025 CMS SSVI
        </div>
      </div>

      {/* Agency name + location */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
          padding: "0 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: nameSize,
            fontWeight: 600,
            color: "#F7F0E1",
            lineHeight: 1.12,
            maxWidth: 1040,
          }}
        >
          {name}
        </div>
        {where ? (
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 28,
              color: "#93A0B8",
            }}
          >
            {where}
          </div>
        ) : null}
      </div>

      {/* Score row */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "0 80px 56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div
              style={{
                display: "flex",
                fontSize: 25,
                fontWeight: 600,
                color: "#E8CFA0",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              SSVI
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 78,
                fontWeight: 700,
                color: "#F7F0E1",
              }}
            >
              {score}
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#93A0B8" }}>
              / 16
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: riskColor,
              color: "#0E1830",
              fontSize: 25,
              fontWeight: 700,
              padding: "10px 26px",
              borderRadius: 999,
            }}
          >
            {risk.label}
          </div>
        </div>

        {/* Score bar */}
        <div
          style={{
            display: "flex",
            marginTop: 26,
            width: "100%",
            height: 12,
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: `${barPct}%`,
              height: 12,
              borderRadius: 999,
              background: riskColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default async function Image({ params }) {
  const [mark, fraunces] = await Promise.all([
    loadAsset("connect-shield-mark.png"),
    loadFraunces(),
  ]);

  let agency = null;
  try {
    agency = await getAgency(params?.slug);
  } catch {
    agency = null;
  }

  const options = { ...size };
  if (fraunces) {
    options.fonts = [
      { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
    ];
  }

  return new ImageResponse(
    agency ? (
      <AgencyCard agency={agency} mark={mark} />
    ) : (
      <DefaultCard mark={mark} />
    ),
    options
  );
}
