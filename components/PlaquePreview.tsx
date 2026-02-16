import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PlaqueState, Shape, Fixing, Material } from '../types';

interface Props {
  state: PlaqueState;
}

// Math helper for Oval scalloped border
function getEllipseCircleIntersectionX(A: number, B: number, r: number) {
  const a = B * B - A * A;
  const b = 2 * A * A * A;
  const c = A * A * r * r - A * A * A * A - A * A * B * B;
  if (Math.abs(a) < 1e-9) return -c / b;
  const delta = b * b - 4 * a * c;
  if (delta < 0) return A - r;
  const x1 = (-b + Math.sqrt(delta)) / (2 * a);
  const x2 = (-b - Math.sqrt(delta)) / (2 * a);
  const target = A - r;
  return Math.abs(x1 - target) < Math.abs(x2 - target) ? x1 : x2;
}

const PlaquePreview = forwardRef<SVGSVGElement, Props>(({ state }, ref) => {
  const woodExtra = state.wood ? 25 : 0;
  const totalW = state.width + woodExtra;
  const totalH = state.height + woodExtra;
  const offset = woodExtra / 2;

  // Helpers for geometry
  const cornerR = state.shape === Shape.Rect ? state.cornerRadius : 0;
  const isBrass = state.material.includes('brass');
  const fillUrl = isBrass ? "url(#brass)" : "url(#steel)";
  
  // Calculations for holes/caps
  const holeInset = 10 + (state.capSize === 15 ? 2 : 0);
  const capRadius = state.capSize / 2;
  const hasCaps = state.fixing === Fixing.Caps;
  
  let holes: {x: number, y: number}[] = [];
  const cx = offset + state.width / 2;
  const cy = offset + state.height / 2;

  // Calculate fixing positions
  if (state.fixing !== Fixing.VHB) {
    if (state.shape === Shape.Rect) {
      const x1 = offset + holeInset;
      const x2 = offset + state.width - holeInset;
      const y1 = offset + holeInset;
      const y2 = offset + state.height - holeInset;
      holes = [{x:x1, y:y1}, {x:x2, y:y1}, {x:x2, y:y2}, {x:x1, y:y2}];
    } else {
      const rx = state.width / 2;
      const xOffset = rx - holeInset;
      holes = [{x:cx - xOffset, y:cy}, {x:cx + xOffset, y:cy}];
    }
  }

  // --- Auto-Scaling Text Logic ---
  const textGroupRef = useRef<SVGGElement>(null);
  const [textTransform, setTextTransform] = useState("");

  useLayoutEffect(() => {
    if (textGroupRef.current) {
      try {
        const bbox = textGroupRef.current.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          // Define Safe Area
          const margin = state.shape === Shape.Rect ? 30 : 50;
          const safeW = Math.max(10, state.width - margin * 2);
          const safeH = Math.max(10, state.height - margin * 2);

          // Calculate Scale to fit
          const scaleX = safeW / bbox.width;
          const scaleY = safeH / bbox.height;
          const scale = Math.min(scaleX, scaleY, 1.5) * 0.9; // Cap max scale up

          // Calculate Centering
          // We want the center of the bounding box to align with (0,0) of the group
          // The group is already translated to (cx, cy)
          const centerOffsetX = -(bbox.x + bbox.width / 2);
          const centerOffsetY = -(bbox.y + bbox.height / 2);

          setTextTransform(`scale(${scale}) translate(${centerOffsetX}, ${centerOffsetY})`);
        }
      } catch (e) {
        // getBBox might fail if not rendered yet or in some headless envs
        console.warn("Text scaling failed", e);
      }
    }
  }, [state.generatedSvgContent, state.width, state.height, state.shape]);


  // --- Border Path Logic ---
  const renderBorder = () => {
    if (!state.border) return null;
    const bColor = "rgba(0,0,0,0.75)";
    const bInset = holeInset;
    const scallopR = capRadius + 3;

    // SCALLOPED BORDER LOGIC
    if (hasCaps && holes.length > 0) {
      // 1. Rectangle with Scalloped Corners
      if (state.shape === Shape.Rect && holes.length === 4) {
        const [tl, tr, br, bl] = holes;
        const r = scallopR;
        // Draw path going around the caps
        const d = `
          M ${tl.x + r} ${tl.y}
          L ${tr.x - r} ${tr.y} A ${r} ${r} 0 0 0 ${tr.x} ${tr.y + r}
          L ${br.x} ${br.y - r} A ${r} ${r} 0 0 0 ${br.x - r} ${br.y}
          L ${bl.x + r} ${bl.y} A ${r} ${r} 0 0 0 ${bl.x} ${bl.y - r}
          L ${tl.x} ${tl.y + r} A ${r} ${r} 0 0 0 ${tl.x + r} ${tl.y} Z
        `;
        return <path d={d} fill="none" stroke={bColor} strokeWidth={1} className="engraved-border" />;
      } 
      
      // 2. Oval with Scalloped Sides
      else if (state.shape !== Shape.Rect && holes.length === 2) {
        const rx = state.width / 2 - bInset;
        const ry = state.height / 2 - bInset;
        
        // Math to find intersection of scallop circle and main ellipse
        // We assume the scallop is centered at the hole position (calculated relative to center)
        // Note: The math helper assumes centered at (0,0), so we use dimensions
        const ix = getEllipseCircleIntersectionX(rx, ry, scallopR);
        const iy = ry * Math.sqrt(1 - (ix * ix) / (rx * rx));
        
        const xRight = cx + ix;
        const xLeft = cx - ix;
        const yTop = cy - iy;
        const yBot = cy + iy;

        let d = `M ${xRight} ${yTop}`;
        d += ` A ${rx} ${ry} 0 0 0 ${xLeft} ${yTop}`;
        d += ` A ${scallopR} ${scallopR} 0 1 1 ${xLeft} ${yBot}`;
        d += ` A ${rx} ${ry} 0 0 0 ${xRight} ${yBot}`;
        d += ` A ${scallopR} ${scallopR} 0 1 1 ${xRight} ${yTop}`;
        d += ` Z`;

        return <path d={d} fill="none" stroke={bColor} strokeWidth={1} className="engraved-border" />;
      }
    }

    // STANDARD BORDER (No Caps or VHB)
    if (state.shape === Shape.Rect) {
      return (
        <rect
          x={offset + bInset} y={offset + bInset}
          width={state.width - bInset * 2}
          height={state.height - bInset * 2}
          rx={Math.max(0, cornerR - 2)}
          fill="none" stroke={bColor} strokeWidth={1}
          className="engraved-border"
        />
      );
    } else {
      return (
        <ellipse
          cx={cx} cy={cy}
          rx={state.width / 2 - bInset}
          ry={state.height / 2 - bInset}
          fill="none" stroke={bColor} strokeWidth={1}
          className="engraved-border"
        />
      );
    }
  };

  const defaultContent = `
    <g>
      <text y="-25" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="28" fill="#332211">YOUR TEXT HERE</text>
      <path d="M -50 -10 L 50 -10" stroke="#332211" stroke-width="0.5" opacity="0.5"/>
      <text y="15" text-anchor="middle" font-family="Lato" font-size="12" fill="#443322">
        Type in the box to design
      </text>
    </g>
  `;

  return (
    <div className="print-content w-full aspect-video flex items-center justify-center p-4 md:p-10 relative overflow-hidden bg-gradient-radial from-[#262a38] to-[#090a0e] rounded-2xl border border-white/5">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="w-full h-full max-w-[90%] max-h-[90%] drop-shadow-2xl transition-all duration-300"
      >
        <defs>
          <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d6b25a" />
            <stop offset="0.3" stopColor="#fff1b0" />
            <stop offset="0.6" stopColor="#b48832" />
            <stop offset="1" stopColor="#8a5e23" />
          </linearGradient>
          <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#bcc7d3" />
            <stop offset="0.3" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#9aa4b2" />
            <stop offset="1" stopColor="#7c8594" />
          </linearGradient>
          <linearGradient id="screwMetal" x1="0" y1="0" x2="1" y2="1">
             <stop offset="0" stopColor="#e5e7eb" />
             <stop offset="0.5" stopColor="#9ca3af" />
             <stop offset="1" stopColor="#4b5563" />
          </linearGradient>
          <linearGradient id="woodDark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5c3a1e" />
            <stop offset="0.5" stopColor="#6b4323" />
            <stop offset="1" stopColor="#2c180b" />
          </linearGradient>
          <linearGradient id="woodLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d4a373" />
            <stop offset="0.5" stopColor="#faedcd" />
            <stop offset="1" stopColor="#a98467" />
          </linearGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="4" result="offsetblur" />
            <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
            <feMerge><feMergeNode in="offsetblur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer><feFuncA type="linear" slope="0.1" /></feComponentTransfer>
          </filter>
        </defs>

        {/* Wood Backing - Added class for export targeting */}
        {state.wood && (
          <g filter="url(#dropShadow)" className="wood-backing">
             {state.shape === Shape.Rect ? (
                <>
                  <rect 
                    x={0} y={0} width={totalW} height={totalH} rx={0} ry={0} 
                    fill={state.woodTone === 'dark' ? "url(#woodDark)" : "url(#woodLight)"} 
                  />
                  {state.woodEdge === 'bevel' && (
                    <rect x={4} y={4} width={totalW - 8} height={totalH - 8} rx={0} ry={0} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
                  )}
                </>
             ) : (
                <>
                  <ellipse
                    cx={totalW / 2} cy={totalH / 2} 
                    rx={totalW / 2} ry={totalH / 2}
                    fill={state.woodTone === 'dark' ? "url(#woodDark)" : "url(#woodLight)"}
                  />
                  {state.woodEdge === 'bevel' && (
                     <ellipse
                      cx={totalW / 2} cy={totalH / 2} 
                      rx={(totalW / 2) - 4} ry={(totalH / 2) - 4}
                      fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={2}
                    />
                  )}
                </>
             )}
          </g>
        )}

        {/* Main Plaque Group */}
        <g id="plate-group" filter="url(#dropShadow)">
          {/* Main Shape (Cut Line) */}
          {state.shape === Shape.Rect ? (
            <rect 
              x={offset} y={offset} width={state.width} height={state.height} rx={cornerR}
              fill={fillUrl} stroke="rgba(255,255,255,0.4)" strokeWidth={0.5}
              className="cut-line"
            />
          ) : (
            <ellipse 
              cx={cx} cy={cy} rx={state.width / 2} ry={state.height / 2}
              fill={fillUrl} stroke="rgba(255,255,255,0.4)" strokeWidth={0.5}
              className="cut-line"
            />
          )}

          {/* Texture Overlay */}
          {(state.material.includes('brushed') || state.material.includes('aged')) && (
            state.shape === Shape.Rect ? (
              <rect x={offset} y={offset} width={state.width} height={state.height} rx={cornerR} fill="transparent" filter="url(#noise)" className="visual-effect" />
            ) : (
              <ellipse cx={cx} cy={cy} rx={state.width/2} ry={state.height/2} fill="transparent" filter="url(#noise)" className="visual-effect" />
            )
          )}
          
          {/* Aged Patina Overlay */}
          {state.material === Material.AgedBrass && (
             state.shape === Shape.Rect ? (
              <rect 
                x={offset} y={offset} width={state.width} height={state.height} rx={cornerR} 
                fill="#2b1d0e" opacity={state.ageIntensity * 0.9} style={{mixBlendMode: 'multiply'}} 
                className="visual-effect"
              />
            ) : (
              <ellipse 
                cx={cx} cy={cy} rx={state.width/2} ry={state.height/2} 
                fill="#2b1d0e" opacity={state.ageIntensity * 0.9} style={{mixBlendMode: 'multiply'}} 
                className="visual-effect"
              />
            )
          )}

          {/* Border */}
          <g id="border-layer">{renderBorder()}</g>

          {/* Text Layer (AI Generated or Default) */}
          <g transform={`translate(${cx}, ${cy})`}>
             <g 
                id="ai-text-layer" 
                ref={textGroupRef}
                transform={textTransform}
                dangerouslySetInnerHTML={{ __html: state.generatedSvgContent || defaultContent }}
             />
          </g>
        </g>

        {/* Fixings (Top Layer) */}
        <g id="fixings-layer">
          {holes.map((h, i) => (
            <g key={i}>
              {state.fixing === Fixing.Caps ? (
                <g className="fixing cap">
                  {/* Cap Body - matches material */}
                  <circle cx={h.x} cy={h.y} r={capRadius} fill={fillUrl} stroke="rgba(0,0,0,0.5)" strokeWidth={0.5} />
                  
                  {/* Patina for Aged Brass Caps */}
                  {state.material === Material.AgedBrass && (
                      <circle cx={h.x} cy={h.y} r={capRadius} fill="#2b1d0e" opacity={state.ageIntensity * 0.9} style={{mixBlendMode: 'multiply'}} className="visual-effect" />
                  )}

                  {/* Subtle flat highlight instead of dome */}
                  <circle cx={h.x} cy={h.y} r={capRadius * 0.8} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} className="visual-effect" />
                </g>
              ) : (
                <g className="fixing hole">
                  {/* Countersunk screw look */}
                  <circle cx={h.x} cy={h.y} r={4.5} fill="url(#screwMetal)" stroke="#555" strokeWidth={0.5} />
                  {/* Phillips Cross */}
                  <path 
                    d={`M${h.x-2},${h.y} L${h.x+2},${h.y} M${h.x},${h.y-2} L${h.x},${h.y+2}`} 
                    stroke="#333" strokeWidth={1.5} strokeLinecap="round" 
                  />
                  {/* Inner shadow for depth */}
                  <circle cx={h.x} cy={h.y} r={4.5} fill="url(#noise)" opacity={0.3} style={{mixBlendMode: 'multiply'}} />
                </g>
              )}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
});

PlaquePreview.displayName = 'PlaquePreview';
export default PlaquePreview;