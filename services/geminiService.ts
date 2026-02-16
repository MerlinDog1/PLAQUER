import { AVAILABLE_FONTS, PlaqueState, Shape, Material, Fixing } from "../types";

const PROXY_URL = "https://wbtpizrlayiedgwrtpwl.functions.supabase.co/gemini-proxy";

const retryWrapper = async <T>(
  operation: () => Promise<T>,
  retries = 4,
  baseDelay = 1400
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const msg = String(error?.message || error || "").toLowerCase();
    const status = error?.status || error?.code;
    const retriable =
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      msg.includes("overloaded") ||
      msg.includes("timeout") ||
      msg.includes("temporar") ||
      msg.includes("503");

    if (retries > 0 && retriable) {
      await new Promise((r) => setTimeout(r, baseDelay));
      return retryWrapper(operation, retries - 1, Math.round(baseDelay * 1.6));
    }
    throw error;
  }
};

async function callProxy(payload: Record<string, any>) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    // ignore parse and use raw text below
  }

  if (!res.ok) {
    const e: any = new Error(json?.error || text || `Proxy failed (${res.status})`);
    e.status = res.status;
    throw e;
  }

  return json;
}

function extractJsonObject(text: string): any {
  const trimmed = (text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // attempt fenced-json recovery
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    // attempt first {...} block recovery
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON");
  }
}

export const generateLayout = async (
  promptText: string,
  width: number,
  height: number,
  shape: Shape,
  currentSvgContent?: string | null
): Promise<{ svgContent: string; reasoning: string } | null> => {
  const fontList = AVAILABLE_FONTS.join(", ");

  let margin = 20;
  if (shape !== Shape.Rect) margin = 40;
  const safeW = width - margin * 2;
  const safeH = height - margin * 2;

  const systemPrompt = `
Act as a Professional Typesetter and Copy Editor for engraved plaques.
Canvas: ${width}x${height}mm. Safe Zone: ${safeW}x${safeH}mm.
Available Fonts: ${fontList}.

Instructions:
1) Fix spelling/grammar and proper capitalization.
2) Create elegant typographic hierarchy and spacing.
3) Center everything (0,0 is center of text group).
4) Use only <text> and <tspan>.
5) Use fill="#2b1d0e".
6) Return ONLY JSON with keys: reasoning (string), svgContent (string).
7) svgContent must be valid inner SVG group content (no outer <svg> wrapper).
${currentSvgContent ? "8) You are modifying an existing design; preserve style unless user asks for major changes." : ""}
  `.trim();

  let userContent = `REQUEST: "${promptText}"`;
  if (currentSvgContent) {
    userContent = `CURRENT_DESIGN:\n${currentSvgContent}\n\nUSER_REQUEST: "${promptText}"\n\nTask: update the design.`;
  }

  const fullPrompt = `${systemPrompt}\n\n${userContent}`;

  const json = await retryWrapper(async () =>
    callProxy({
      task: "text",
      model: "gemini-2.5-flash",
      prompt: fullPrompt,
    })
  );

  const parsed = extractJsonObject(json?.text || "");
  if (!parsed?.svgContent) throw new Error("AI did not return svgContent");

  return {
    svgContent: String(parsed.svgContent),
    reasoning: String(parsed.reasoning || "Generated updated layout."),
  };
};

export const generateRealisticView = async (
  svgBase64: string,
  state: PlaqueState
): Promise<string | null> => {
  const materials = {
    [Material.BrushedBrass]: {
      name: "Brushed Brass",
      hex: "#D4AF37",
      texture: "Horizontal brushed metal grain",
      details: "Satin finish, soft linear reflections, premium gold tone",
    },
    [Material.PolishedBrass]: {
      name: "Polished Brass",
      hex: "#F5E050",
      texture: "Mirror-smooth",
      details: "High-gloss, highly reflective, mirror finish gold",
    },
    [Material.AgedBrass]: {
      name: "Aged Antique Brass",
      hex: "#8B6F4E",
      texture: "Weathered patina",
      details: "Matte finish, uneven oxidation, vintage bronze/brown tones",
    },
    [Material.BrushedSteel]: {
      name: "Brushed Stainless Steel",
      hex: "#C0C0C0",
      texture: "Horizontal brushed metal grain",
      details: "Satin finish, industrial silver tone, sharp highlights",
    },
    [Material.PolishedSteel]: {
      name: "Polished Chrome",
      hex: "#E0E0E0",
      texture: "Mirror-smooth",
      details: "High-gloss, chrome reflectivity, cool silver tone",
    },
  };

  const mat = materials[state.material];

  const shapeDesc =
    state.shape === Shape.Rect
      ? state.cornerRadius > 0
        ? "Rounded Rectangle"
        : "Sharp Rectangle"
      : state.shape === Shape.Circle
      ? "Circle"
      : "Oval";

  let backingDesc = "None (Mounted directly to wall)";
  if (state.wood) {
    const tone = state.woodTone === "dark" ? "Dark Walnut" : "Light Oak";
    const edge = state.woodEdge === "bevel" ? "beveled" : "square";
    let backingShape = "Rectangular";
    if (state.shape === Shape.Circle) backingShape = "Round/Circular";
    if (state.shape === Shape.Oval) backingShape = "Oval";

    backingDesc = `Solid Wood Backing Board. Material: ${tone}. Edge: ${edge}. Shape: ${backingShape} (following plaque contour with small border).`;
  }

  let hardwareDesc = "Hidden adhesive (VHB) - Floating appearance";
  if (state.fixing === Fixing.Screws || state.fixing === Fixing.Caps) {
    const isRect = state.shape === Shape.Rect;
    const count = isRect ? "4x" : "2x";
    const pos = isRect ? "in the four corners" : "left and right center";

    if (state.fixing === Fixing.Screws) {
      hardwareDesc = `${count} Countersunk Screws positioned ${pos}. Material: ${mat.name}.`;
    } else {
      hardwareDesc = `${count} Decorative Dome Caps positioned ${pos}. Diameter: ${state.capSize}mm. Material: ${mat.name}.`;
    }
  }

  const prompt = `
Generate a high-definition photorealistic product image.
Use the attached image as a strict engraving stencil mask.
Do NOT alter letterforms, border lines, or geometry.
Engrave visible mask lines deeply with black enamel fill.

Scene: close-up product shot, 15° angle, studio lighting, clean light wall.
Material: ${mat.name} (${mat.hex}), ${mat.texture}, ${mat.details}.
Shape: ${shapeDesc}.
Backing: ${backingDesc}.
Hardware: ${hardwareDesc}.
Engraving: deep etch with black enamel.
  `.trim();

  const json = await retryWrapper(async () =>
    callProxy({
      task: "image",
      imageModel: "gemini-3-pro-image-preview",
      prompt,
      imageBase64: svgBase64,
      imageMimeType: "image/png",
    })
  );

  return json?.bytesBase64Encoded || null;
};
