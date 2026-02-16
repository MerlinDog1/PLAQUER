import { PlaqueState, Fixing } from "../types";

// Type definitions for external libraries loaded via CDN
declare global {
  interface Window {
    opentype: any;
    jspdf: any;
    jsPDF: any;
    svg2pdf: any;
  }
}

// Map fonts to reliable, static WOFF files from JSDelivr (via Fontsource)
const fontMap: Record<string, string> = {
  // Serifs
  "Cinzel": "https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.0.0/files/cinzel-latin-700-normal.woff",
  "Playfair Display": "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.0/files/playfair-display-latin-700-normal.woff",
  "EB Garamond": "https://cdn.jsdelivr.net/npm/@fontsource/eb-garamond@5.0.0/files/eb-garamond-latin-600-normal.woff",
  "Merriweather": "https://cdn.jsdelivr.net/npm/@fontsource/merriweather@5.0.0/files/merriweather-latin-700-normal.woff",
  "Lora": "https://cdn.jsdelivr.net/npm/@fontsource/lora@5.0.0/files/lora-latin-600-normal.woff",
  "Roboto Slab": "https://cdn.jsdelivr.net/npm/@fontsource/roboto-slab@5.0.0/files/roboto-slab-latin-500-normal.woff",
  "Bitter": "https://cdn.jsdelivr.net/npm/@fontsource/bitter@5.0.0/files/bitter-latin-700-normal.woff",
  "Abril Fatface": "https://cdn.jsdelivr.net/npm/@fontsource/abril-fatface@5.0.0/files/abril-fatface-latin-400-normal.woff",

  // Sans
  "Montserrat": "https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.0.0/files/montserrat-latin-600-normal.woff",
  "Open Sans": "https://cdn.jsdelivr.net/npm/@fontsource/open-sans@5.0.0/files/open-sans-latin-600-normal.woff",
  "Lato": "https://cdn.jsdelivr.net/npm/@fontsource/lato@5.0.0/files/lato-latin-700-normal.woff",
  "Oswald": "https://cdn.jsdelivr.net/npm/@fontsource/oswald@5.0.0/files/oswald-latin-600-normal.woff",
  "Raleway": "https://cdn.jsdelivr.net/npm/@fontsource/raleway@5.0.0/files/raleway-latin-700-normal.woff",
  "Bebas Neue": "https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.0.0/files/bebas-neue-latin-400-normal.woff",

  // Scripts / Display
  "Dancing Script": "https://cdn.jsdelivr.net/npm/@fontsource/dancing-script@5.0.0/files/dancing-script-latin-700-normal.woff",
  "Pacifico": "https://cdn.jsdelivr.net/npm/@fontsource/pacifico@5.0.0/files/pacifico-latin-400-normal.woff",
  "Satisfy": "https://cdn.jsdelivr.net/npm/@fontsource/satisfy@5.0.0/files/satisfy-latin-400-normal.woff",
  "Caveat": "https://cdn.jsdelivr.net/npm/@fontsource/caveat@5.0.0/files/caveat-latin-700-normal.woff",
  "Pinyon Script": "https://cdn.jsdelivr.net/npm/@fontsource/pinyon-script@5.0.0/files/pinyon-script-latin-400-normal.woff",
  "Allura": "https://cdn.jsdelivr.net/npm/@fontsource/allura@5.0.0/files/allura-latin-400-normal.woff",
  "Alex Brush": "https://cdn.jsdelivr.net/npm/@fontsource/alex-brush@5.0.0/files/alex-brush-latin-400-normal.woff",
  "Great Vibes": "https://cdn.jsdelivr.net/npm/@fontsource/great-vibes@5.0.0/files/great-vibes-latin-400-normal.woff",
};

const DEFAULT_FALLBACK_FONT = "Open Sans";

const firstFontFamily = (ff: string) => ff ? ff.split(",")[0].trim().replace(/^["']|["']$/g, "") : "";

const loadFontsUsedInLayer = async (liveLayer: Element) => {
  const fontSet = new Set<string>();
  const elems = Array.from(liveLayer.querySelectorAll("text, tspan"));
  
  // Always add the fallback font
  fontSet.add(DEFAULT_FALLBACK_FONT);

  elems.forEach((node) => {
    const style = window.getComputedStyle(node);
    const fam = firstFontFamily(node.getAttribute("font-family") || style.fontFamily);
    if (fam) fontSet.add(fam);
  });

  const loadedFonts: Record<string, any> = {};
  
  await Promise.all(Array.from(fontSet).map(async (fam) => {
    const url = fontMap[fam];
    if (!url) return;
    try {
      const buff = await fetch(url).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.arrayBuffer();
      });
      loadedFonts[fam] = window.opentype.parse(buff);
    } catch (e) {
      console.error(`FAILED to load font "${fam}".`, e);
    }
  }));

  return loadedFonts;
};

// Convert text nodes to path data
const outlineTextLayer = async (cloneSvg: SVGSVGElement, sourceSvg: SVGSVGElement) => {
  const cloneTextGroup = cloneSvg.querySelector("#ai-text-layer");
  const sourceTextGroup = sourceSvg.querySelector("#ai-text-layer");
  
  if (!cloneTextGroup || !sourceTextGroup) return;

  // Sync transform explicitly to ensure React-applied transforms are captured
  const groupTransform = sourceTextGroup.getAttribute("transform");
  if (groupTransform) {
    cloneTextGroup.setAttribute("transform", groupTransform);
  }

  await document.fonts.ready;
  const loadedFonts = await loadFontsUsedInLayer(sourceTextGroup);
  const fallbackFont = loadedFonts[DEFAULT_FALLBACK_FONT];
  
  const cloneTextEls = Array.from(cloneTextGroup.querySelectorAll("text"));
  const sourceTextEls = Array.from(sourceTextGroup.querySelectorAll("text"));

  for (let i = 0; i < cloneTextEls.length; i++) {
    const textEl = cloneTextEls[i];
    const sourceEl = sourceTextEls[i];
    if (!sourceEl) continue;

    const cloneTspans = Array.from(textEl.querySelectorAll("tspan"));
    const sourceTspans = Array.from(sourceEl.querySelectorAll("tspan"));

    const isMultiPart = cloneTspans.length > 0;
    const runs = isMultiPart ? cloneTspans : [textEl];
    const sourceRuns = isMultiPart ? sourceTspans : [sourceEl];

    let fullyConverted = true;

    for (let j = 0; j < runs.length; j++) {
      const run = runs[j];
      const sourceRun = sourceRuns[j] as SVGTextContentElement;

      const textContent = (run.textContent || "").trim();
      if (!textContent) continue;

      const style = window.getComputedStyle(sourceRun); 
      const fam = firstFontFamily(sourceRun.getAttribute("font-family") || style.fontFamily);
      
      let font = loadedFonts[fam] || fallbackFont;
      if (!font) {
          console.error(`CRITICAL: No fonts available for "${textContent}".`);
          run.setAttribute("fill", "#FF0000");
          fullyConverted = false;
          continue;
      }

      // Robust Font Size Detection: Prefer Attribute over Computed Style (which returns px on screen)
      let fontSize = 12;
      const fsAttr = sourceRun.getAttribute("font-size") || sourceRun.parentElement?.getAttribute("font-size");
      if (fsAttr) {
        fontSize = parseFloat(fsAttr.replace("px", ""));
      } else {
        // Fallback to style only if attribute is missing, but be wary of unit mismatch
        fontSize = parseFloat(style.fontSize) || 12;
      }

      let startX = 0, startY = 0;
      let usedBrowserLayout = false;

      // 1. Try Browser Layout Engine (getStartPositionOfChar)
      // This is the gold standard as it handles text-anchor, tspan flow, dx/dy, and transforms automatically.
      try {
         // We query index 0 of the current run's text content.
         // Note: getStartPositionOfChar works in User Units (viewBox units), not screen pixels.
         const pt = sourceRun.getStartPositionOfChar(0); 
         if (pt) {
             startX = pt.x;
             startY = pt.y;
             usedBrowserLayout = true;
         }
      } catch (e) { 
         // Expected if node is not rendered, but we force rendering in prepareCloneForProduction
         // console.warn("Layout engine check failed", e);
      }

      // 2. Fallback: Manual Calculation (If layout engine fails)
      if (!usedBrowserLayout) {
          const textAnchor = sourceRun.getAttribute("text-anchor") || style.textAnchor || "start";
          let xAttr = run.getAttribute("x");
          let yAttr = run.getAttribute("y");
          
          // Inherit from parent text if tspan missing coords
          if (!xAttr && textEl.getAttribute("x")) xAttr = textEl.getAttribute("x");
          if (!yAttr && textEl.getAttribute("y")) yAttr = textEl.getAttribute("y");

          let x = parseFloat(xAttr || "0");
          let y = parseFloat(yAttr || "0");
          
          const width = font.getAdvanceWidth(textContent, fontSize);
          
          if (textAnchor === "middle") x -= width / 2;
          if (textAnchor === "end") x -= width;
          
          startX = x;
          startY = y;
      }

      try {
        const path = font.getPath(textContent, startX, startY, fontSize);
        const pathData = path.toPathData(2);
        
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", pathData);
        pathEl.setAttribute("fill", "#000000");
        pathEl.setAttribute("stroke", "none");
        
        // Preserve transform from the text element itself (e.g. if individual text was rotated)
        // But do NOT apply group transforms here, they are on the parent group.
        const transform = run.getAttribute("transform");
        if (transform) pathEl.setAttribute("transform", transform);

        if (textEl.parentNode) {
            textEl.parentNode.insertBefore(pathEl, textEl);
        }
      } catch (err) {
        console.warn(`Could not generate path for text "${textContent}".`, err);
        fullyConverted = false;
      }
    }
    
    if (fullyConverted) {
      textEl.remove();
    }
  }
};

const prepareCloneForProduction = async (sourceSvg: SVGSVGElement, state: PlaqueState) => {
  const clone = sourceSvg.cloneNode(true) as SVGSVGElement;
  
  // Set dimensions to mm explicitly for Corel/PDF
  const woodExtra = state.wood ? 25 : 0;
  const totalW = state.width + woodExtra;
  const totalH = state.height + woodExtra;
  clone.setAttribute("width", `${totalW}mm`);
  clone.setAttribute("height", `${totalH}mm`);
  clone.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);

  // CRITICAL: Ensure the clone is part of the DOM tree and "visible" 
  // so that getStartPositionOfChar returns correct values.
  // We position it far off-screen to avoid visual flickering.
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.top = "-10000px";
  wrapper.style.left = "-10000px";
  // wrapper.style.visibility = "hidden"; // DO NOT USE HIDDEN. It breaks getStartPositionOfChar in some browsers.
  wrapper.style.opacity = "0.01"; // Make it practically invisible but rendered.
  wrapper.style.pointerEvents = "none";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await outlineTextLayer(clone, sourceSvg);

    // Process Wood Backing (Convert to Cut Line)
    const woodBacking = clone.querySelector(".wood-backing");
    if (woodBacking) {
       woodBacking.removeAttribute("filter");
       const shapes = Array.from(woodBacking.querySelectorAll("rect, ellipse"));
       shapes.forEach((shape, index) => {
         // The first shape is the main board outline
         if (index === 0) {
           shape.removeAttribute("fill");
           shape.setAttribute("fill", "none");
           shape.setAttribute("stroke", "#0000FF"); // Blue hair-line for wood cut (Different from Metal)
           shape.setAttribute("stroke-width", "0.01mm");
           shape.removeAttribute("filter");
           shape.removeAttribute("style");
         } else {
           // Remove decorative bevel lines or secondary shapes
           shape.remove();
         }
       });
    }

    // Remove Visual Effects & Backgrounds (visual-effects only, preserved wood-backing above)
    clone.querySelectorAll(".visual-effect").forEach(el => el.remove());
    
    // Process Cut Line (Metal Plaque)
    const cutLine = clone.querySelector(".cut-line") as SVGElement | null;
    if (cutLine) {
      cutLine.removeAttribute("fill");
      cutLine.setAttribute("fill", "none");
      cutLine.setAttribute("stroke", "#FF0000"); // Red hair-line for Metal Cut
      cutLine.setAttribute("stroke-width", "0.01mm"); 
      cutLine.removeAttribute("filter");
      cutLine.removeAttribute("style");
    }

    // Process Fixings
    const fixingsLayer = clone.querySelector("#fixings-layer");
    if (fixingsLayer) {
      // Replace complex fixing visuals with simple cut circles
      const groups = fixingsLayer.querySelectorAll("g");
      groups.forEach(g => {
        const mainCircle = g.querySelector("circle");
        if (mainCircle) {
           const newCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
           newCircle.setAttribute("cx", mainCircle.getAttribute("cx") || "0");
           newCircle.setAttribute("cy", mainCircle.getAttribute("cy") || "0");
           newCircle.setAttribute("r", "2.5"); 
           newCircle.setAttribute("fill", "none");
           newCircle.setAttribute("stroke", "#FF0000");
           newCircle.setAttribute("stroke-width", "0.01mm");
           g.parentNode?.insertBefore(newCircle, g);
           g.remove();
        } else {
            g.remove();
        }
      });
    }

    // Process Engraving (Borders & Text Paths)
    const borders = clone.querySelectorAll(".engraved-border");
    borders.forEach(el => {
      el.removeAttribute("fill");
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", "#000000");
      el.setAttribute("stroke-width", "0.25mm"); // Standard engraving width
      el.removeAttribute("filter");
      el.removeAttribute("style");
    });
    
    // Ensure all other paths (text) are black filled
    clone.querySelectorAll("path").forEach(path => {
        if (path.classList.contains("engraved-border") || path.getAttribute("stroke") === "#FF0000" || path.getAttribute("stroke") === "#0000FF") return;
        path.setAttribute("fill", "#000000");
        path.setAttribute("stroke", "none");
    });

    // Cleanup Defs/Styles
    const defs = clone.querySelector("defs");
    if (defs) defs.remove();
    clone.querySelectorAll("filter, style").forEach(el => el.remove());
    clone.querySelectorAll("*").forEach(el => {
        el.removeAttribute("filter");
        el.removeAttribute("style");
        if (el.getAttribute("opacity")) el.removeAttribute("opacity");
    });

    return clone;
  } finally {
    document.body.removeChild(wrapper);
  }
};

export const downloadCorelSvg = async (sourceSvg: SVGSVGElement, state: PlaqueState) => {
  try {
    const clone = await prepareCloneForProduction(sourceSvg, state);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` + new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `plaque_${state.width}x${state.height}_${state.material}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("Export failed", e);
    alert("Export failed: " + e);
  }
};

export const downloadPdf = async (sourceSvg: SVGSVGElement, state: PlaqueState) => {
  try {
    let jsPDFCtor = window.jsPDF; 
    if (!jsPDFCtor && window.jspdf && window.jspdf.jsPDF) {
        jsPDFCtor = window.jspdf.jsPDF;
    }
    
    if (!jsPDFCtor) {
       console.log("Waiting for jsPDF...");
       await new Promise(r => setTimeout(r, 1500)); 
       jsPDFCtor = window.jsPDF || (window.jspdf ? window.jspdf.jsPDF : null);
       if (!jsPDFCtor) throw new Error("PDF Library (jsPDF) not loaded. Please refresh.");
    }

    const clone = await prepareCloneForProduction(sourceSvg, state);
    
    const woodExtra = state.wood ? 25 : 0;
    const widthMm = state.width + woodExtra;
    const heightMm = state.height + woodExtra;

    const orientation = widthMm > heightMm ? 'l' : 'p';
    const doc = new jsPDFCtor({
      orientation,
      unit: "mm",
      format: [widthMm, heightMm]
    });

    const wrapper = document.createElement("div");
    wrapper.style.visibility = "hidden";
    wrapper.style.position = "absolute";
    wrapper.style.top = "-9999px";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
        if (typeof doc.svg !== 'function' && !window.svg2pdf) {
             console.log("Waiting for svg2pdf...");
             await new Promise(r => setTimeout(r, 1000)); 
        }

        if (typeof doc.svg === 'function') {
            await doc.svg(clone, { x: 0, y: 0, width: widthMm, height: heightMm });
        } 
        else if (window.svg2pdf && typeof window.svg2pdf === 'function') {
             await window.svg2pdf(clone, doc, { x: 0, y: 0, width: widthMm, height: heightMm });
        }
        else if (window.svg2pdf && (window.svg2pdf as any).default) {
             await (window.svg2pdf as any).default(clone, doc, { x: 0, y: 0, width: widthMm, height: heightMm });
        }
        else {
             throw new Error("PDF Converter (svg2pdf) not loaded.");
        }

        doc.save(`plaque_${widthMm}x${heightMm}_${state.material}.pdf`);
    } finally {
        document.body.removeChild(wrapper);
    }

  } catch (e) {
    console.error("PDF Export failed", e);
    alert("PDF Export failed: " + e);
  }
};

export const svgToPngBase64 = async (sourceSvg: SVGSVGElement): Promise<string> => {
   const clone = sourceSvg.cloneNode(true) as SVGSVGElement;
   const vb = sourceSvg.viewBox.baseVal;
   const scale = 1024 / vb.width;
   const w = Math.round(vb.width * scale);
   const h = Math.round(vb.height * scale);
   clone.setAttribute("width", `${w}px`);
   clone.setAttribute("height", `${h}px`);

   const wrapper = document.createElement("div");
   wrapper.style.position = "absolute";
   wrapper.style.top = "-9999px";
   wrapper.style.left = "-9999px";
   wrapper.style.opacity = "0"; 
   wrapper.appendChild(clone);
   document.body.appendChild(wrapper);

   try {
      await outlineTextLayer(clone, sourceSvg);
      
      clone.querySelectorAll(".engraved-border").forEach(el => {
       el.setAttribute("stroke", "#000000");
       el.setAttribute("fill", "none");
     });
     clone.querySelectorAll("filter, defs > filter").forEach(el => el.remove());
     clone.querySelectorAll("[filter]").forEach(el => el.removeAttribute("filter"));

     const xml = new XMLSerializer().serializeToString(clone);
     const svg64 = btoa(unescape(encodeURIComponent(xml)));
     const image64 = `data:image/svg+xml;base64,${svg64}`;
    
     return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("Canvas error");
          ctx.fillStyle = "#ffffff"; 
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png").split(",")[1]);
        };
        img.onerror = reject;
        img.src = image64;
      });
   } finally {
     document.body.removeChild(wrapper);
   }
};