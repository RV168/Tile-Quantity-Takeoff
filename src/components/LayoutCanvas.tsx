import React, { useRef, useState, useEffect } from "react";
import { RoomSpec, TileSpec, Opening, StartingPoint, LayoutResult, CalculatedTile } from "../types";
import { Maximize2, Move, AlertTriangle, LayoutGrid, Sliders, Eye, ZoomIn, ZoomOut, Search } from "lucide-react";

interface LayoutCanvasProps {
  roomSpec: RoomSpec;
  tileSpec: TileSpec;
  openings: Opening[];
  setOpenings: React.Dispatch<React.SetStateAction<Opening[]>>;
  startingPoint: StartingPoint;
  setStartingPoint: (sp: StartingPoint) => void;
  customOffsetX: number;
  setCustomOffsetX: (x: number) => void;
  customOffsetY: number;
  setCustomOffsetY: (y: number) => void;
  layoutResult: LayoutResult;
  isIsometric?: boolean;
  isometricNotes?: string;
  isDarkMode?: boolean;
}

export default function LayoutCanvas({
  roomSpec,
  tileSpec,
  openings,
  setOpenings,
  startingPoint,
  setStartingPoint,
  customOffsetX,
  setCustomOffsetX,
  customOffsetY,
  setCustomOffsetY,
  layoutResult,
  isIsometric = false,
  isometricNotes = "",
  isDarkMode = false,
}: LayoutCanvasProps) {
  const [isDraggingAnchor, setIsDraggingAnchor] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [showTileBorders, setShowTileBorders] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  // Use a fixed container coordinate layout space for the CAD workspace.
  // This layout is perfectly scaled via SVG 100% width and height, preventing
  // vertical scrolling and securing the grid relative to the viewport height.
  const dimensions = { width: 1200, height: 800 };

  // 1. Compute Scale Factor to fit Room inside the SVG container
  const padding = 50; // margin in pixels
  const availW = dimensions.width - padding * 2;
  const availH = dimensions.height - padding * 2;

  const roomW = roomSpec.widthMm;
  const roomH = roomSpec.heightMm;

  // Preserve aspect ratio inside the fixed container dimensions
  const scaleX = availW / roomW;
  const scaleY = availH / roomH;
  const scale = Math.min(scaleX, scaleY);

  // Centering translation inside the SVG view
  const xOffset = (dimensions.width - roomW * scale) / 2;
  const yOffset = (dimensions.height - roomH * scale) / 2;

  // Convert mm to pixels
  const toPxX = (mm: number) => xOffset + mm * scale;
  const toPxY = (mm: number) => yOffset + mm * scale;
  const toPxLength = (mm: number) => mm * scale;

  // Convert pixels back to mm for drag offset
  const toMmX = (px: number) => (px - xOffset) / scale;
  const toMmY = (px: number) => (px - yOffset) / scale;

  // Get current starting anchor point in millimeter coordinates
  const getAnchorMm = () => {
    // Return approximate anchor coordinates
    if (startingPoint === "Custom") {
      return { x: customOffsetX, y: customOffsetY };
    }
    // Calculate based on preset
    const stepW = tileSpec.widthMm + tileSpec.groutWidthMm;
    const stepH = tileSpec.heightMm + tileSpec.groutWidthMm;

    switch (startingPoint) {
      case "Top-Left":
        return { x: 0, y: 0 };
      case "Top-Right":
        return { x: roomW % stepW, y: 0 };
      case "Bottom-Left":
        return { x: 0, y: roomH % stepH };
      case "Bottom-Right":
        return { x: roomW % stepW, y: roomH % stepH };
      case "Center":
        return { x: roomW / 2, y: roomH / 2 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const anchorMm = getAnchorMm();

  // Dragging custom starting point using screen-to-SVG transform
  const handleMouseDown = (e: React.MouseEvent<SVGGElement>) => {
    if (startingPoint !== "Custom") {
      setStartingPoint("Custom");
      setCustomOffsetX(anchorMm.x);
      setCustomOffsetY(anchorMm.y);
    }
    
    setIsDraggingAnchor(true);
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    if (!svgPoint) return;
    const mouseX = svgPoint.x;
    const mouseY = svgPoint.y;

    setDragStart({ x: mouseX, y: mouseY });
    setInitialOffset({ x: customOffsetX, y: customOffsetY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingAnchor) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    if (!svgPoint) return;
    const mouseX = svgPoint.x;
    const mouseY = svgPoint.y;

    const deltaX = (mouseX - dragStart.x) / scale;
    const deltaY = (mouseY - dragStart.y) / scale;

    const stepW = tileSpec.widthMm + tileSpec.groutWidthMm;
    const stepH = tileSpec.heightMm + tileSpec.groutWidthMm;

    const newX = Math.round(initialOffset.x + deltaX) % stepW;
    const newY = Math.round(initialOffset.y + deltaY) % stepH;

    setCustomOffsetX(newX);
    setCustomOffsetY(newY);
  };

  const handleMouseUpOrLeave = () => {
    setIsDraggingAnchor(false);
  };

  // Pre-calculate unclipped verification pattern grid coordinates
  const tileW = tileSpec.widthMm;
  const tileH = tileSpec.heightMm;
  const stepW = tileW + tileSpec.groutWidthMm;
  const stepH = tileH + tileSpec.groutWidthMm;

  let startX = 0;
  let startY = 0;

  switch (startingPoint) {
    case "Top-Left":
      startX = 0;
      startY = 0;
      break;
    case "Top-Right":
      startX = (roomW % stepW) - stepW;
      startY = 0;
      break;
    case "Bottom-Left":
      startX = 0;
      startY = (roomH % stepH) - stepH;
      break;
    case "Bottom-Right":
      startX = (roomW % stepW) - stepW;
      startY = (roomH % stepH) - stepH;
      break;
    case "Center": {
      const centerX = roomW / 2;
      const centerY = roomH / 2;
      startX = (centerX - tileW / 2) % stepW - stepW;
      startY = (centerY - tileH / 2) % stepH - stepH;
      break;
    }
    case "Custom":
      startX = customOffsetX;
      startY = customOffsetY;
      break;
  }

  const colsNeeded = Math.ceil(roomW / stepW) + 4;
  const rowsNeeded = Math.ceil(roomH / stepH) + 4;
  const minCol = -2;
  const maxCol = colsNeeded;
  const minRow = -2;
  const maxRow = rowsNeeded;

  const overlayTiles: { x: number; y: number; w: number; h: number; row: number; col: number }[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      let tx = startX + c * stepW;
      let ty = startY + r * stepH;

      if (tileSpec.pattern === "Brick Bond" && Math.abs(r) % 2 === 1) {
        tx += stepW / 2;
      } else if (tileSpec.pattern === "Diagonal") {
        tx += (r % 2) * (stepW / 2);
      }

      overlayTiles.push({
        x: tx,
        y: ty,
        w: tileW,
        h: tileH,
        row: r,
        col: c
      });
    }
  }

  // Bracket generator function
  const getOffsetBracket = () => {
    if (tileSpec.pattern !== "Brick Bond" && tileSpec.pattern !== "Diagonal") return null;

    const rOdd = 1;
    const colOffset = Math.floor(colsNeeded / 2);

    let xEven = startX + colOffset * stepW;
    let xOdd = startX + colOffset * stepW;
    
    if (tileSpec.pattern === "Brick Bond") {
      xOdd += stepW / 2;
    } else if (tileSpec.pattern === "Diagonal") {
      xOdd += (rOdd % 2) * (stepW / 2);
    }

    const yJoint = startY + rOdd * stepH;

    const pxEven = toPxX(xEven);
    const pxOdd = toPxX(xOdd);
    const pyJoint = toPxY(yJoint);
    
    if (pxEven < 0 || pxEven > dimensions.width || pxOdd < 0 || pxOdd > dimensions.width || pyJoint < 0 || pyJoint > dimensions.height) {
      return null;
    }

    const midX = (pxEven + pxOdd) / 2;

    return (
      <g id="offset-bracket" className="pointer-events-none">
        <line
          x1={pxEven}
          y1={pyJoint}
          x2={pxOdd}
          y2={pyJoint}
          stroke="#ec4899"
          strokeWidth="1.5"
        />
        <line
          x1={pxEven}
          y1={pyJoint - 6}
          x2={pxEven}
          y2={pyJoint + 6}
          stroke="#ec4899"
          strokeWidth="1.5"
        />
        <line
          x1={pxOdd}
          y1={pyJoint - 6}
          x2={pxOdd}
          y2={pyJoint + 6}
          stroke="#ec4899"
          strokeWidth="1.5"
        />
        <rect
          x={midX - 55}
          y={pyJoint - 22}
          width="110"
          height="14"
          rx="3"
          fill={isDarkMode ? "rgba(236, 72, 153, 0.1)" : "#fdf2f8"}
          stroke="#fbcfe8"
          strokeWidth="1"
        />
        <text
          x={midX}
          y={pyJoint - 12}
          textAnchor="middle"
          className="text-[8px] fill-pink-600 font-mono font-black"
        >
          {Math.round(tileW / 2)} mm (50% Offset)
        </text>
      </g>
    );
  };

  return (
    <div className={`flex-1 flex flex-col bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-full min-h-0 overflow-hidden ${isDarkMode ? 'dark' : ''}`} id="layout-canvas-container">
      {/* Visual Workspace toolbar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-slate-500 dark:text-slate-400 text-xs shadow-sm gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> CAD Workspace Layout
          </span>
          <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200/60 font-semibold font-mono">
            Scale: {(scale * 100).toFixed(1)}% (1px = {Math.round(1 / scale)}mm)
          </span>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Legend Items */}
          <div className="flex items-center gap-3 font-medium text-slate-600 dark:text-slate-300 mr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500 opacity-60"></span>
              <span>Full Tiles ({layoutResult.fullTiles})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 opacity-65"></span>
              <span>Cut Tiles ({layoutResult.partialTiles})</span>
            </div>
            {layoutResult.reusableOffcuts > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 opacity-65"></span>
                <span>Reusable offcuts ({layoutResult.reusableOffcuts})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button onClick={handleZoomOut} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-slate-800 transition-colors" title="Zoom Out">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleResetZoom} className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-slate-800 text-[10px] font-bold transition-colors" title="Reset Zoom">
                {Math.round(zoomLevel * 100)}%
              </button>
              <button onClick={handleZoomIn} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-slate-800 transition-colors" title="Zoom In">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tile Borders Toggle */}
            <button
              onClick={() => setShowTileBorders(!showTileBorders)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                showTileBorders
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-800 shadow-sm"
              }`}
              title="Toggle individual tile borders"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tile Borders: {showTileBorders ? "ON" : "OFF"}</span>
            </button>

            {/* Verification Grid Toggle */}
            <button
              onClick={() => setShowGridOverlay(!showGridOverlay)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                showGridOverlay
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-800 shadow-sm"
              }`}
              title="Toggle pattern grid lines and offset verification overlay"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Grid Overlay: {showGridOverlay ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Workspace */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#F8FAFC] dark:bg-slate-950">
        <div className="w-full h-full overflow-auto relative">
          <div style={{ width: `${Math.max(100, zoomLevel * 100)}%`, height: `${Math.max(100, zoomLevel * 100)}%` }} className="min-w-full min-h-full flex items-center justify-center">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="cursor-crosshair bg-transparent block"
            >
          {/* Grid Background Pattern for professional blueprints feel */}
          <defs>
            <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDarkMode ? "#1e293b" : "#e2e8f0"} strokeWidth="1" />
            </pattern>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2.5" />
            </pattern>
            <pattern id="openingHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Background Blueprint Grid */}
          <rect width="100%" height="100%" fill="url(#cadGrid)" />

          {/* Verification Grid Pattern Overlay */}
          {showGridOverlay && (
            <g id="verification-grid-overlay" className="opacity-40">
              {overlayTiles.map((ot, idx) => {
                const px = toPxX(ot.x);
                const py = toPxY(ot.y);
                const pw = toPxLength(ot.w);
                const ph = toPxLength(ot.h);

                return (
                  <rect
                    key={`overlay-tile-${idx}`}
                    x={px}
                    y={py}
                    width={pw}
                    height={ph}
                    fill="rgba(99, 102, 241, 0.015)"
                    stroke="#818cf8"
                    strokeWidth="0.8"
                    strokeDasharray="2,3"
                    className="pointer-events-none"
                  />
                );
              })}
              {/* Render dynamic pink bracket/offset annotations */}
              {getOffsetBracket()}
            </g>
          )}

          {/* SVG Groups for layering */}
          <g id="tiles-grid">
            {layoutResult.tiles.map((t) => {
              // Ensure we don't render tiles that are completely outside the room bounds
              if (!t.isInside) return null;

              // Compute coordinates in SVG space
              const px = toPxX(t.x);
              const py = toPxY(t.y);
              const pw = toPxLength(t.w);
              const ph = toPxLength(t.h);

              // Styling values based on state
              let tileFill = "rgba(99, 102, 241, 0.08)"; // Soft indigo for full tiles
              let strokeColor = isDarkMode ? "rgba(99, 102, 241, 0.6)" : "rgba(99, 102, 241, 0.35)"; // Teal/Indigo edge
              let strokeDash = "0";

              if (t.isPartial) {
                if (t.reusable) {
                  tileFill = "rgba(16, 185, 129, 0.12)"; // green for reusable offcuts
                  strokeColor = isDarkMode ? "rgba(16, 185, 129, 0.7)" : "rgba(16, 185, 129, 0.5)";
                } else {
                  tileFill = "rgba(245, 158, 11, 0.1)"; // amber for regular cuts
                  strokeColor = isDarkMode ? "rgba(245, 158, 11, 0.7)" : "rgba(245, 158, 11, 0.5)";
                  strokeDash = "2,2";
                }
              }

              // Render simple rectangle if it fits perfectly inside, or clipped polygon
              // For a Rectangular room, we clip tiles strictly within W & H
              // We can use an SVG clip-path matching the room shape or mathematically compute the cut boundary
              // Let's create an SVG clip path specifically matching the room geometry! This handles L-shape perfectly.
              return (
                <g key={t.id} clipPath="url(#roomClip)">
                  {/* The actual tile shape */}
                  <rect
                    x={px}
                    y={py}
                    width={pw}
                    height={ph}
                    fill={tileFill}
                    stroke={showTileBorders ? strokeColor : "none"}
                    strokeWidth={showTileBorders ? "1" : "0"}
                    strokeDasharray={strokeDash}
                  />

                  {/* Draw cut markings or dimension labels inside cuts if they are large enough */}
                  {t.isPartial && pw > 35 && ph > 35 && (
                    <text
                      x={px + pw / 2}
                      y={py + ph / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[9px] fill-amber-700 font-bold font-mono pointer-events-none"
                    >
                      {Math.round(t.cutWidthMm)}×{Math.round(t.cutHeightMm)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Definitions for Room Clip Path */}
          <defs>
            <clipPath id="roomClip">
              {roomSpec.shape === "Rectangular" && (
                <rect x={toPxX(0)} y={toPxY(0)} width={toPxLength(roomW)} height={toPxLength(roomH)} />
              )}
              {roomSpec.shape === "L-Shape" && (
                <polygon points={`${toPxX(0)},${toPxY(0)} ${toPxX(roomW)},${toPxY(0)} ${toPxX(roomW)},${toPxY(roomH - roomSpec.indentHeightMm)} ${toPxX(roomW - roomSpec.indentWidthMm)},${toPxY(roomH - roomSpec.indentHeightMm)} ${toPxX(roomW - roomSpec.indentWidthMm)},${toPxY(roomH)} ${toPxX(0)},${toPxY(roomH)}`} />
              )}
              {roomSpec.shape === "U-Shape" && (
                <polygon points={`${toPxX(0)},${toPxY(0)} ${toPxX((roomW - roomSpec.indentWidthMm)/2)},${toPxY(0)} ${toPxX((roomW - roomSpec.indentWidthMm)/2)},${toPxY(roomSpec.indentHeightMm)} ${toPxX((roomW + roomSpec.indentWidthMm)/2)},${toPxY(roomSpec.indentHeightMm)} ${toPxX((roomW + roomSpec.indentWidthMm)/2)},${toPxY(0)} ${toPxX(roomW)},${toPxY(0)} ${toPxX(roomW)},${toPxY(roomH)} ${toPxX(0)},${toPxY(roomH)}`} />
              )}
              {roomSpec.shape === "Triangle" && (
                <polygon points={`${toPxX(roomW/2)},${toPxY(0)} ${toPxX(roomW)},${toPxY(roomH)} ${toPxX(0)},${toPxY(roomH)}`} />
              )}
              {roomSpec.shape === "Circular" && (
                <ellipse cx={toPxX(roomW/2)} cy={toPxY(roomH/2)} rx={toPxLength(roomW/2)} ry={toPxLength(roomH/2)} />
              )}
              {roomSpec.shape === "Octagon" && (
                <polygon points={`${toPxX(Math.min(roomW, roomH)/3.414)},${toPxY(0)} ${toPxX(roomW - Math.min(roomW, roomH)/3.414)},${toPxY(0)} ${toPxX(roomW)},${toPxY(Math.min(roomW, roomH)/3.414)} ${toPxX(roomW)},${toPxY(roomH - Math.min(roomW, roomH)/3.414)} ${toPxX(roomW - Math.min(roomW, roomH)/3.414)},${toPxY(roomH)} ${toPxX(Math.min(roomW, roomH)/3.414)},${toPxY(roomH)} ${toPxX(0)},${toPxY(roomH - Math.min(roomW, roomH)/3.414)} ${toPxX(0)},${toPxY(Math.min(roomW, roomH)/3.414)}`} />
              )}
            </clipPath>
          </defs>

          {/* Deduct Openings/Deductions layer */}
          <g id="openings-layer">
            {openings.map((op) => {
              const opX = toPxX(op.xMm);
              const opY = toPxY(op.yMm);
              const opW = toPxLength(op.widthMm);
              const opH = toPxLength(op.heightMm);

              return (
                <g key={op.id}>
                  {/* Red/Gray Hatching for deduction area */}
                  <rect
                    x={opX}
                    y={opY}
                    width={opW}
                    height={opH}
                    fill="url(#openingHatch)"
                    stroke={isDarkMode ? "#475569" : "#64748b"}
                    strokeWidth="1.5"
                    strokeDasharray="4,2"
                    className="opacity-70"
                  />
                  {/* Solid background behind text */}
                  <rect
                    x={opX + 4}
                    y={opY + 4}
                    width={opW - 8 > 60 ? 60 : Math.max(0, opW - 8)}
                    height="14"
                    fill="#e2e8f0"
                    rx="3"
                    className="opacity-95"
                  />
                  <text
                    x={opX + 8}
                    y={opY + 14}
                    className="text-[8px] fill-slate-700 font-bold"
                  >
                    {op.type}
                  </text>
                  
                  {/* Dimension overlay */}
                  <text
                    x={opX + opW / 2}
                    y={opY + opH - 4}
                    textAnchor="middle"
                    className="text-[8px] fill-slate-600 font-bold font-mono"
                  >
                    {op.widthMm}x{op.heightMm} mm
                  </text>
                </g>
              );
            })}
          </g>

          {/* Heavy Room boundary border */}
          {roomSpec.shape === "Rectangular" && (
            <rect x={toPxX(0)} y={toPxY(0)} width={toPxLength(roomW)} height={toPxLength(roomH)} fill="none" stroke={isDarkMode ? "#94a3b8" : "#1e293b"} strokeWidth="2.5" id="room-border" />
          )}
          {roomSpec.shape === "L-Shape" && (
            <polygon points={`${toPxX(0)},${toPxY(0)} ${toPxX(roomW)},${toPxY(0)} ${toPxX(roomW)},${toPxY(roomH - roomSpec.indentHeightMm)} ${toPxX(roomW - roomSpec.indentWidthMm)},${toPxY(roomH - roomSpec.indentHeightMm)} ${toPxX(roomW - roomSpec.indentWidthMm)},${toPxY(roomH)} ${toPxX(0)},${toPxY(roomH)}`} fill="none" stroke={isDarkMode ? "#94a3b8" : "#1e293b"} strokeWidth="2.5" id="room-border" />
          )}
          {roomSpec.shape === "U-Shape" && (
            <polygon points={`${toPxX(0)},${toPxY(0)} ${toPxX((roomW - roomSpec.indentWidthMm)/2)},${toPxY(0)} ${toPxX((roomW - roomSpec.indentWidthMm)/2)},${toPxY(roomSpec.indentHeightMm)} ${toPxX((roomW + roomSpec.indentWidthMm)/2)},${toPxY(roomSpec.indentHeightMm)} ${toPxX((roomW + roomSpec.indentWidthMm)/2)},${toPxY(0)} ${toPxX(roomW)},${toPxY(0)} ${toPxX(roomW)},${toPxY(roomH)} ${toPxX(0)},${toPxY(roomH)}`} fill="none" stroke={isDarkMode ? "#94a3b8" : "#1e293b"} strokeWidth="2.5" id="room-border" />
          )}
          {roomSpec.shape === "Triangle" && (
            <polygon points={`${toPxX(roomW/2)},${toPxY(0)} ${toPxX(roomW)},${toPxY(roomH)} ${toPxX(0)},${toPxY(roomH)}`} fill="none" stroke={isDarkMode ? "#94a3b8" : "#1e293b"} strokeWidth="2.5" id="room-border" />
          )}
          {roomSpec.shape === "Circular" && (
            <ellipse cx={toPxX(roomW/2)} cy={toPxY(roomH/2)} rx={toPxLength(roomW/2)} ry={toPxLength(roomH/2)} fill="none" stroke={isDarkMode ? "#94a3b8" : "#1e293b"} strokeWidth="2.5" id="room-border" />
          )}
          {roomSpec.shape === "Octagon" && (
            <polygon points={`${toPxX(Math.min(roomW, roomH)/3.414)},${toPxY(0)} ${toPxX(roomW - Math.min(roomW, roomH)/3.414)},${toPxY(0)} ${toPxX(roomW)},${toPxY(Math.min(roomW, roomH)/3.414)} ${toPxX(roomW)},${toPxY(roomH - Math.min(roomW, roomH)/3.414)} ${toPxX(roomW - Math.min(roomW, roomH)/3.414)},${toPxY(roomH)} ${toPxX(Math.min(roomW, roomH)/3.414)},${toPxY(roomH)} ${toPxX(0)},${toPxY(roomH - Math.min(roomW, roomH)/3.414)} ${toPxX(0)},${toPxY(Math.min(roomW, roomH)/3.414)}`} fill="none" stroke={isDarkMode ? "#94a3b8" : "#1e293b"} strokeWidth="2.5" id="room-border" />
          )}

          {/* Outer Room Dimensions lines */}
          <g id="dimension-lines" className="text-[10px] fill-slate-600 font-mono font-bold">
            {/* Top Width Dimension line */}
            <line
              x1={toPxX(0)}
              y1={toPxY(0) - 15}
              x2={toPxX(roomW)}
              y2={toPxY(0) - 15}
              stroke={isDarkMode ? "#475569" : "#64748b"}
              strokeWidth="1"
            />
            {/* Dimension end ticks */}
            <line x1={toPxX(0)} y1={toPxY(0) - 20} x2={toPxX(0)} y2={toPxY(0) - 10} stroke={isDarkMode ? "#475569" : "#64748b"} strokeWidth="1" />
            <line x1={toPxX(roomW)} y1={toPxY(0) - 20} x2={toPxX(roomW)} y2={toPxY(0) - 10} stroke={isDarkMode ? "#475569" : "#64748b"} strokeWidth="1" />
            <text x={toPxX(roomW / 2)} y={toPxY(0) - 24} textAnchor="middle">
              {roomSpec.shape === 'Circular' ? 'D' : 'W'}: {roomW} mm
            </text>

            {/* Left Height Dimension line */}
            <line
              x1={toPxX(0) - 15}
              y1={toPxY(0)}
              x2={toPxX(0) - 15}
              y2={toPxY(roomH)}
              stroke={isDarkMode ? "#475569" : "#64748b"}
              strokeWidth="1"
            />
            <line x1={toPxX(0) - 20} y1={toPxY(0)} x2={toPxX(0) - 10} y2={toPxY(0)} stroke={isDarkMode ? "#475569" : "#64748b"} strokeWidth="1" />
            <line x1={toPxX(0) - 20} y1={toPxY(roomH)} x2={toPxX(0) - 10} y2={toPxY(roomH)} stroke={isDarkMode ? "#475569" : "#64748b"} strokeWidth="1" />
            {roomSpec.shape !== 'Circular' && (
              <text
                x={toPxX(0) - 24}
                y={toPxY(roomH / 2)}
                textAnchor="middle"
                transform={`rotate(-90, ${toPxX(0) - 24}, ${toPxY(roomH / 2)})`}
              >
                H: {roomH} mm
              </text>
            )}

            {/* L-Shape Cutout Dimension labels if L-shape */}
            {roomSpec.shape === "L-Shape" && (
              <>
                {/* Cutout Width line */}
                <line
                  x1={toPxX(roomW - roomSpec.indentWidthMm)}
                  y1={toPxY(roomH) + 15}
                  x2={toPxX(roomW)}
                  y2={toPxY(roomH) + 15}
                  stroke={isDarkMode ? "#94a3b8" : "#475569"}
                  strokeWidth="0.8"
                />
                <text x={toPxX(roomW - roomSpec.indentWidthMm / 2)} y={toPxY(roomH) + 26} textAnchor="middle" className="fill-slate-500">
                  Cutout W: {roomSpec.indentWidthMm} mm
                </text>

                {/* Cutout Height line */}
                <line
                  x1={toPxX(roomW) + 15}
                  y1={toPxY(roomH - roomSpec.indentHeightMm)}
                  x2={toPxX(roomW) + 15}
                  y2={toPxY(roomH)}
                  stroke={isDarkMode ? "#94a3b8" : "#475569"}
                  strokeWidth="0.8"
                />
                <text
                  x={toPxX(roomW) + 26}
                  y={toPxY(roomH - roomSpec.indentHeightMm / 2)}
                  textAnchor="middle"
                  className="fill-slate-500"
                  transform={`rotate(90, ${toPxX(roomW) + 26}, ${toPxY(roomH - roomSpec.indentHeightMm / 2)})`}
                >
                  Cutout H: {roomSpec.indentHeightMm} mm
                </text>
              </>
            )}
          </g>

          {/* Interactive Laying Starting Anchor Target (Drag and drop) */}
          <g
            id="start-anchor"
            transform={`translate(${toPxX(anchorMm.x)}, ${toPxY(anchorMm.y)})`}
            onMouseDown={handleMouseDown}
            className="cursor-move group"
          >
            {/* Outer animated visual ring */}
            <circle
              r="14"
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.5"
              className="opacity-30 group-hover:opacity-75 transition-opacity animate-pulse"
            />
            {/* Main anchor core */}
            <circle r="6" fill="#6366f1" stroke={isDarkMode ? "#0f172a" : "#ffffff"} strokeWidth="1.5" />
            {/* Hairlines */}
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#6366f1" strokeWidth="1" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#6366f1" strokeWidth="1" />
            
            {/* Custom Tooltip on hover */}
            <rect
              x="-65"
              y="-38"
              width="130"
              height="20"
              rx="4"
              fill={isDarkMode ? "#1e293b" : "#ffffff"}
              stroke="#6366f1"
              strokeWidth="1"
              className="opacity-0 group-hover:opacity-95 transition-opacity pointer-events-none"
            />
            <text
              x="0"
              y="-25"
              textAnchor="middle"
              className="text-[9px] fill-indigo-700 font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              Starting Point Anchor (Drag)
            </text>
          </g>
        </svg>
        </div>
        </div>

        {/* Verification Grid Info Panel */}
        {showGridOverlay && (
          <div className="absolute bottom-4 right-4 p-3.5 bg-white/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] flex flex-col gap-1.5 shadow-lg max-w-[280px] z-10 animate-in fade-in slide-in-from-bottom-2 duration-200" id="verification-overlay-card">
            <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <strong className="text-slate-900 dark:text-white font-bold uppercase font-mono tracking-wider text-[9px]">Verification Overlay</strong>
            </div>
            <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Pattern:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-right">{tileSpec.pattern}</span>
              
              <span className="font-semibold text-slate-500 dark:text-slate-400">Tile Size:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{tileW} × {tileH} mm</span>

              <span className="font-semibold text-slate-500 dark:text-slate-400">Offset Shift:</span>
              <span className="font-black text-slate-900 dark:text-white text-right">
                {tileSpec.pattern === "Straight" ? "0% (None)" : `50% (${Math.round(tileW / 2)} mm)`}
              </span>
              
              <span className="font-semibold text-slate-500 dark:text-slate-400">Grout Joint:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{tileSpec.groutWidthMm} mm</span>
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-1.5">
              Dashed grid lines show unclipped tile borders outside walls. Pink brackets indicate calculated alternating course shifts.
            </p>
          </div>
        )}

        {/* Isometric Drawing Notification Badge */}
        {isIsometric && (
          <div className="absolute top-4 left-4 right-4 p-3.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-900 rounded-lg text-xs flex flex-col gap-1 shadow-md z-10">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-bold tracking-wider uppercase font-mono">3D Isometric Detected</span>
              <strong className="text-indigo-950 font-semibold">Projected into Flat 2D CAD Blueprint</strong>
            </div>
            {isometricNotes && (
              <p className="text-indigo-700 dark:text-indigo-300 text-[11px] leading-relaxed font-medium">
                {isometricNotes}
              </p>
            )}
          </div>
        )}

        {/* Warning if there's very small slivers */}
        {layoutResult.smallestCutMm2 > 0 && layoutResult.smallestCutMm2 < 2000 && (
          <div className="absolute bottom-4 left-4 right-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-2.5 shadow-md">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Layout Warning:</strong> Narrow sliver cuts detected along the edges ({Math.round(layoutResult.smallestCutDim.w)} mm). Try dragging the Starting Point Anchor to balance tile cuts!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
