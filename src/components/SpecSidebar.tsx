import React, { useState } from "react";
import {
  RoomSpec,
  TileSpec,
  Opening,
  StartingPoint,
  RoomShape,
  LayingPattern,
  TileOrientation,
  OpeningType,
} from "../types";
import { Plus, Trash2, LayoutGrid, Info, Layers, RefreshCw, ArrowLeftRight } from "lucide-react";

interface SpecSidebarProps {
  roomSpec: RoomSpec;
  setRoomSpec: React.Dispatch<React.SetStateAction<RoomSpec>>;
  tileSpec: TileSpec;
  setTileSpec: React.Dispatch<React.SetStateAction<TileSpec>>;
  openings: Opening[];
  setOpenings: React.Dispatch<React.SetStateAction<Opening[]>>;
  startingPoint: StartingPoint;
  setStartingPoint: (sp: StartingPoint) => void;
  customOffsetX: number;
  setCustomOffsetX: (x: number) => void;
  customOffsetY: number;
  setCustomOffsetY: (y: number) => void;
  suggestedWastagePercent: number;
  setSuggestedWastagePercent: (w: number) => void;
}

export default function SpecSidebar({
  roomSpec,
  setRoomSpec,
  tileSpec,
  setTileSpec,
  openings,
  setOpenings,
  startingPoint,
  setStartingPoint,
  customOffsetX,
  setCustomOffsetX,
  customOffsetY,
  setCustomOffsetY,
  suggestedWastagePercent,
  setSuggestedWastagePercent,
}: SpecSidebarProps) {
  const [newOpType, setNewOpType] = useState<OpeningType>("Floor Trap");
  const [newOpW, setNewOpW] = useState<number>(300);
  const [newOpH, setNewOpH] = useState<number>(300);

  const addOpening = () => {
    // Generate logical positions inside the room
    const xMm = Math.round(roomSpec.widthMm / 3);
    const yMm = Math.round(roomSpec.heightMm / 3);

    const newOpening: Opening = {
      id: `op-${Date.now()}`,
      type: newOpType,
      widthMm: newOpW,
      heightMm: newOpH,
      xMm,
      yMm,
    };
    setOpenings([...openings, newOpening]);
  };

  const removeOpening = (id: string) => {
    setOpenings(openings.filter((op) => op.id !== id));
  };

  const updateOpening = (id: string, field: keyof Opening, value: number) => {
    setOpenings(
      openings.map((op) => {
        if (op.id === id) {
          return { ...op, [field]: value };
        }
        return op;
      })
    );
  };

  const applyTileDimensions = (w: number, h: number) => {
    setTileSpec((prev) => {
      if (w === h) {
        return { ...prev, widthMm: w, heightMm: h };
      }
      const wantsPortrait = prev.orientation === "Portrait";
      const isPortraitPreset = w <= h;
      
      let newW = w;
      let newH = h;
      
      // Keep the width/height aligned with the global orientation toggle
      if (wantsPortrait !== isPortraitPreset) {
        newW = h;
        newH = w;
      }
      return { ...prev, widthMm: newW, heightMm: newH };
    });
  };

  const swapTileDimensions = () => {
    setTileSpec((prev) => {
      const newOrientation = prev.orientation === "Portrait" ? "Landscape" : "Portrait";
      return { ...prev, widthMm: prev.heightMm, heightMm: prev.widthMm, orientation: newOrientation };
    });
  };

  const adjustTileDimension = (field: "widthMm" | "heightMm", delta: number) => {
    setTileSpec((prev) => ({ ...prev, [field]: Math.max(10, prev[field] + delta) }));
  };

  React.useEffect(() => {
    if (tileSpec.widthMm > tileSpec.heightMm && tileSpec.orientation === "Portrait") {
      setTileSpec(prev => ({ ...prev, orientation: "Landscape" }));
    } else if (tileSpec.heightMm > tileSpec.widthMm && tileSpec.orientation === "Landscape") {
      setTileSpec(prev => ({ ...prev, orientation: "Portrait" }));
    }
  }, [tileSpec.widthMm, tileSpec.heightMm, tileSpec.orientation, setTileSpec]);

  const handleOrientationChange = (newOrientation: TileOrientation) => {
    setTileSpec((prev) => {
      // If square, just update the string, no swapping needed
      if (prev.widthMm === prev.heightMm) {
        return { ...prev, orientation: newOrientation };
      }
      
      const isCurrentlyPortrait = prev.widthMm <= prev.heightMm;
      const wantsPortrait = newOrientation === "Portrait";
      
      let newW = prev.widthMm;
      let newH = prev.heightMm;
      
      if (wantsPortrait !== isCurrentlyPortrait) {
        newW = prev.heightMm;
        newH = prev.widthMm;
      }
      
      return { ...prev, orientation: newOrientation, widthMm: newW, heightMm: newH };
    });
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 overflow-y-auto h-full flex flex-col" id="spec-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-base">Specifications Manager</h2>
        </div>
        <button
          onClick={() => {
            // Reset to default
            setRoomSpec({ shape: "Rectangular", widthMm: 4000, heightMm: 3000, indentWidthMm: 1200, indentHeightMm: 1200 });
            setTileSpec({
              widthMm: 600,
              heightMm: 600,
              thicknessMm: 10,
              tileType: "Porcelain",
              material: "Clay-based",
              finish: "Matte",
              orientation: "Portrait",
              pattern: "Straight",
              groutWidthMm: 3,
              perimeterJointMm: 6,
            });
            setOpenings([]);
            setStartingPoint("Center");
            setCustomOffsetX(0);
            setCustomOffsetY(0);
            setSuggestedWastagePercent(10);
          }}
          title="Reset specifications"
          className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* 1. ROOM / AREA INFORMATION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">1</span>
            <h3 className="font-medium text-slate-700 dark:text-slate-200 text-sm">Room / Area Boundary</h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <button
              onClick={() => setRoomSpec((prev) => ({ ...prev, shape: "Rectangular" }))}
              className={`p-2 rounded-lg border text-[11px] font-medium text-center transition-all ${
                roomSpec.shape === "Rectangular"
                  ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Rectangular
            </button>
            <button
              onClick={() => setRoomSpec((prev) => ({ ...prev, shape: "L-Shape" }))}
              className={`p-2 rounded-lg border text-[11px] font-medium text-center transition-all ${
                roomSpec.shape === "L-Shape"
                  ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              L-Shape
            </button>
            <button
              onClick={() => setRoomSpec((prev) => ({ ...prev, shape: "U-Shape" }))}
              className={`p-2 rounded-lg border text-[11px] font-medium text-center transition-all ${
                roomSpec.shape === "U-Shape"
                  ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              U-Shape
            </button>
            <button
              onClick={() => setRoomSpec((prev) => ({ ...prev, shape: "Triangle" }))}
              className={`p-2 rounded-lg border text-[11px] font-medium text-center transition-all ${
                roomSpec.shape === "Triangle"
                  ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Triangle
            </button>
            <button
              onClick={() => setRoomSpec((prev) => ({ ...prev, shape: "Circular", heightMm: prev.widthMm }))}
              className={`p-2 rounded-lg border text-[11px] font-medium text-center transition-all ${
                roomSpec.shape === "Circular"
                  ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Circular
            </button>
            <button
              onClick={() => setRoomSpec((prev) => ({ ...prev, shape: "Octagon" }))}
              className={`p-2 rounded-lg border text-[11px] font-medium text-center transition-all ${
                roomSpec.shape === "Octagon"
                  ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Octagon
            </button>
          </div>

          {roomSpec.shape === "Circular" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Diameter (D) - mm</label>
                <input
                  type="number"
                  value={roomSpec.widthMm}
                  onChange={(e) => setRoomSpec((prev) => ({ ...prev, widthMm: Math.max(100, Number(e.target.value)), heightMm: Math.max(100, Number(e.target.value)) }))}
                  className="w-full text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Radius (r) - mm</label>
                <input
                  type="number"
                  value={Math.round(roomSpec.widthMm / 2)}
                  onChange={(e) => setRoomSpec((prev) => ({ ...prev, widthMm: Math.max(100, Number(e.target.value) * 2), heightMm: Math.max(100, Number(e.target.value) * 2) }))}
                  className="w-full text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Overall Width (W) - mm</label>
                <input
                  type="number"
                  value={roomSpec.widthMm}
                  onChange={(e) => {
                    const val = Math.max(100, Number(e.target.value));
                    setRoomSpec((prev) => ({ ...prev, widthMm: val, ...(prev.shape === 'Octagon' || prev.shape === 'Triangle' ? {} : {}) }));
                  }}
                  className="w-full text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Overall Height (H) - mm</label>
                <input
                  type="number"
                  value={roomSpec.heightMm}
                  onChange={(e) => {
                    const val = Math.max(100, Number(e.target.value));
                    setRoomSpec((prev) => ({ ...prev, heightMm: val }));
                  }}
                  className="w-full text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {(roomSpec.shape === "L-Shape" || roomSpec.shape === "U-Shape") && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/30 border border-indigo-100 dark:border-indigo-800 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Cutout Width (IW) - mm</label>
                <input
                  type="number"
                  value={roomSpec.indentWidthMm}
                  onChange={(e) =>
                    setRoomSpec((prev) => ({
                      ...prev,
                      indentWidthMm: Math.min(prev.widthMm - 100, Math.max(0, Number(e.target.value))),
                    }))
                  }
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Cutout Height (IH) - mm</label>
                <input
                  type="number"
                  value={roomSpec.indentHeightMm}
                  onChange={(e) =>
                    setRoomSpec((prev) => ({
                      ...prev,
                      indentHeightMm: Math.min(prev.heightMm - 100, Math.max(0, Number(e.target.value))),
                    }))
                  }
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. TILE SPECIFICATIONS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">2</span>
              <h3 className="font-medium text-slate-700 dark:text-slate-200 text-sm">Tile Details</h3>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleOrientationChange("Portrait")}
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                  tileSpec.orientation === "Portrait" 
                    ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-700 dark:text-indigo-300" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
              >
                Portrait
              </button>
              <button
                onClick={() => handleOrientationChange("Landscape")}
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                  tileSpec.orientation === "Landscape" 
                    ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-700 dark:text-indigo-300" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
              >
                Landscape
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Square Formats</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "100", w: 100, h: 100, labelFull: "100x100" },
                  { label: "200", w: 200, h: 200, labelFull: "200x200" },
                  { label: "300", w: 300, h: 300, labelFull: "300x300" },
                  { label: "600", w: 600, h: 600, labelFull: "600x600" },
                  { label: "800", w: 800, h: 800, labelFull: "800x800" },
                ].map((p) => {
                  const isSelected = tileSpec.widthMm === p.w && tileSpec.heightMm === p.h;
                  return (
                    <button
                      key={p.labelFull}
                      onClick={() => applyTileDimensions(p.w, p.h)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-900"
                      }`}
                      title={`${p.labelFull} mm`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Rectangular Formats</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "300x600", w: 300, h: 600 },
                  { label: "450x900", w: 450, h: 900 },
                  { label: "600x1200", w: 600, h: 1200 },
                ].map((p) => {
                  const isSelected = tileSpec.widthMm === p.w && tileSpec.heightMm === p.h;
                  return (
                    <button
                      key={p.label}
                      onClick={() => applyTileDimensions(p.w, p.h)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-900"
                      }`}
                      title={`${p.label} mm`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Wood Planks</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "150x900", w: 150, h: 900 },
                  { label: "200x1200", w: 200, h: 1200 },
                  { label: "200x1500", w: 200, h: 1500 },
                ].map((p) => {
                  const isSelected = tileSpec.widthMm === p.w && tileSpec.heightMm === p.h;
                  return (
                    <button
                      key={p.label}
                      onClick={() => applyTileDimensions(p.w, p.h)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-900"
                      }`}
                      title={`${p.label} mm`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Manual sizes controls */}
          <div className="bg-slate-50/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono uppercase tracking-wider">Manual Adjustment</span>
              <button
                type="button"
                onClick={swapTileDimensions}
                className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded text-[10px] font-semibold transition-all shadow-sm"
                title="Swap Tile Width and Height"
              >
                <ArrowLeftRight className="w-3 h-3 text-indigo-500" />
                <span>Swap W ⇄ H</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Width */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono">Width (W)</label>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-inner overflow-hidden focus-within:border-indigo-500">
                  <input
                    type="number"
                    value={tileSpec.widthMm}
                    onChange={(e) => setTileSpec((prev) => ({ ...prev, widthMm: Math.max(10, Number(e.target.value)) }))}
                    className="w-full text-slate-800 dark:text-slate-200 text-xs font-bold px-2 py-1 focus:outline-none min-w-0"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 pr-1.5 font-bold font-mono">mm</span>
                </div>
                {/* Adjuster buttons */}
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => adjustTileDimension("widthMm", -50)}
                    className="flex-1 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-[9px] text-slate-600 dark:text-slate-300 rounded font-semibold transition-all shadow-sm"
                    title="Decrease by 50mm"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTileDimension("widthMm", -10)}
                    className="flex-1 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-[9px] text-slate-600 dark:text-slate-300 rounded font-semibold transition-all shadow-sm"
                    title="Decrease by 10mm"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTileDimension("widthMm", 10)}
                    className="flex-1 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-[9px] text-slate-600 dark:text-slate-300 rounded font-semibold transition-all shadow-sm"
                    title="Increase by 10mm"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTileDimension("widthMm", 50)}
                    className="flex-1 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-[9px] text-slate-600 dark:text-slate-300 rounded font-semibold transition-all shadow-sm"
                    title="Increase by 50mm"
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* Height */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono">Height (H)</label>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-inner overflow-hidden focus-within:border-indigo-500">
                  <input
                    type="number"
                    value={tileSpec.heightMm}
                    onChange={(e) => setTileSpec((prev) => ({ ...prev, heightMm: Math.max(10, Number(e.target.value)) }))}
                    className="w-full text-slate-800 dark:text-slate-200 text-xs font-bold px-2 py-1 focus:outline-none min-w-0"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 pr-1.5 font-bold font-mono">mm</span>
                </div>
                {/* Adjuster buttons */}
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => adjustTileDimension("heightMm", -50)}
                    className="flex-1 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-[9px] text-slate-600 dark:text-slate-300 rounded font-semibold transition-all shadow-sm"
                    title="Decrease by 50mm"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTileDimension("heightMm", -10)}
                    className="flex-1 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-[9px] text-slate-600 dark:text-slate-300 rounded font-semibold transition-all shadow-sm"
                    title="Decrease by 10mm"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTileDimension("heightMm", 10)}
                    className="flex-1 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-[9px] text-slate-600 dark:text-slate-300 rounded font-semibold transition-all shadow-sm"
                    title="Increase by 10mm"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTileDimension("heightMm", 50)}
                    className="flex-1 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-[9px] text-slate-600 dark:text-slate-300 rounded font-semibold transition-all shadow-sm"
                    title="Increase by 50mm"
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Material</label>
              <select
                value={tileSpec.tileType}
                onChange={(e) => setTileSpec((prev) => ({ ...prev, tileType: e.target.value }))}
                className="w-full text-slate-800 dark:text-slate-200 text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="Porcelain">Porcelain</option>
                <option value="Ceramic">Ceramic</option>
                <option value="Marble">Marble</option>
                <option value="Granite">Granite</option>
                <option value="Terracotta">Terracotta</option>
                <option value="Cement">Cement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Finish</label>
              <select
                value={tileSpec.finish}
                onChange={(e) => setTileSpec((prev) => ({ ...prev, finish: e.target.value }))}
                className="w-full text-slate-800 dark:text-slate-200 text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="Matte">Matte</option>
                <option value="Polished">Polished</option>
                <option value="Lappato">Lappato / Semi-Gloss</option>
                <option value="Textured">Textured / R11 Anti-slip</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Thickness (mm)</label>
              <input
                type="number"
                value={tileSpec.thicknessMm}
                onChange={(e) => setTileSpec((prev) => ({ ...prev, thicknessMm: Math.max(1, Number(e.target.value)) }))}
                className="w-full text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. LAYING PATTERNS & JOINT DETAILS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">3</span>
            <h3 className="font-medium text-slate-700 dark:text-slate-200 text-sm">Laying & Joint Layout</h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Laying Pattern</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "Straight", label: "Straight", icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="8" height="8" rx="1" />
                      <rect x="13" y="3" width="8" height="8" rx="1" />
                      <rect x="3" y="13" width="8" height="8" rx="1" />
                      <rect x="13" y="13" width="8" height="8" rx="1" />
                    </svg>
                  )},
                  { name: "Stack Bond", label: "Stack Bond", icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="4" y="3" width="16" height="5" rx="0.5" />
                      <rect x="4" y="9.5" width="16" height="5" rx="0.5" />
                      <rect x="4" y="16" width="16" height="5" rx="0.5" />
                    </svg>
                  )},
                  { name: "Brick Bond", label: "Half Bond", icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="4" width="10" height="6" rx="0.5" />
                      <rect x="14" y="4" width="10" height="6" rx="0.5" />
                      <rect x="-4" y="12" width="10" height="6" rx="0.5" />
                      <rect x="8" y="12" width="10" height="6" rx="0.5" />
                      <rect x="20" y="12" width="10" height="6" rx="0.5" />
                    </svg>
                  )},
                  { name: "Quarter Bond", label: "Quarter Bond", icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="2" width="12" height="5" rx="0.5" />
                      <rect x="16" y="2" width="12" height="5" rx="0.5" />
                      <rect x="5" y="8" width="12" height="5" rx="0.5" />
                      <rect x="19" y="8" width="12" height="5" rx="0.5" />
                      <rect x="-7" y="8" width="10" height="5" rx="0.5" />
                      <rect x="8" y="14" width="12" height="5" rx="0.5" />
                      <rect x="-4" y="14" width="10" height="5" rx="0.5" />
                    </svg>
                  )},
                  { name: "One-Third Bond", label: "1/3 Bond", icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="2" width="12" height="5" rx="0.5" />
                      <rect x="16" y="2" width="12" height="5" rx="0.5" />
                      <rect x="6" y="8" width="12" height="5" rx="0.5" />
                      <rect x="20" y="8" width="12" height="5" rx="0.5" />
                      <rect x="-6" y="8" width="10" height="5" rx="0.5" />
                      <rect x="10" y="14" width="12" height="5" rx="0.5" />
                      <rect x="-2" y="14" width="10" height="5" rx="0.5" />
                    </svg>
                  )},
                  { name: "Basketweave", label: "Basketweave", icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="3.5" height="8" rx="0.5" />
                      <rect x="7.5" y="3" width="3.5" height="8" rx="0.5" />
                      <rect x="13" y="3" width="8" height="3.5" rx="0.5" />
                      <rect x="13" y="7.5" width="8" height="3.5" rx="0.5" />
                      
                      <rect x="3" y="13" width="8" height="3.5" rx="0.5" />
                      <rect x="3" y="17.5" width="8" height="3.5" rx="0.5" />
                      <rect x="13" y="13" width="3.5" height="8" rx="0.5" />
                      <rect x="17.5" y="13" width="3.5" height="8" rx="0.5" />
                    </svg>
                  )},
                  { name: "Herringbone", label: "Herringbone", icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M11 2L2 11l4 4 9-9M21 12l-4 4-9-9M16 7l4 4M7 16l4 4" />
                    </svg>
                  )},
                  { name: "Diagonal", label: "Diagonal", icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(45) scale(0.8) translate(3, -4)">
                      <rect x="3" y="3" width="8" height="8" rx="1" />
                      <rect x="13" y="3" width="8" height="8" rx="1" />
                      <rect x="3" y="13" width="8" height="8" rx="1" />
                      <rect x="13" y="13" width="8" height="8" rx="1" />
                    </svg>
                  )}
                ].map((ptn) => (
                  <button
                    key={ptn.name}
                    onClick={() => setTileSpec((prev) => ({ ...prev, pattern: ptn.name as LayingPattern }))}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-center transition-all ${
                      tileSpec.pattern === ptn.name
                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 shadow-sm text-indigo-600 dark:text-indigo-400"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    <div className="mb-1">{ptn.icon}</div>
                    <span className={`text-[9px] font-semibold ${
                      tileSpec.pattern === ptn.name ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {ptn.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Grout Joint Width (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tileSpec.groutWidthMm}
                  onChange={(e) => setTileSpec((prev) => ({ ...prev, groutWidthMm: Math.max(0, Number(e.target.value)) }))}
                  className="w-full text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Starting Point Anchor</label>
              <select
                value={startingPoint}
                onChange={(e) => setStartingPoint(e.target.value as StartingPoint)}
                className="w-full text-slate-800 dark:text-slate-200 text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="Center">Center of Room</option>
                <option value="Top-Left">Top Left Corner</option>
                <option value="Top-Right">Top Right Corner</option>
                <option value="Bottom-Left">Bottom Left Corner</option>
                <option value="Bottom-Right">Bottom Right Corner</option>
                <option value="Custom">Custom Coordinates</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Perim. Joint width (mm)</label>
              <input
                type="number"
                value={tileSpec.perimeterJointMm}
                onChange={(e) => setTileSpec((prev) => ({ ...prev, perimeterJointMm: Math.max(0, Number(e.target.value)) }))}
                className="w-full text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          {startingPoint === "Custom" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
              <div>
                <label className="block text-[10px] font-medium text-amber-700 mb-1">Grid offset X (mm)</label>
                <input
                  type="number"
                  value={customOffsetX}
                  onChange={(e) => setCustomOffsetX(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-amber-700 mb-1">Grid offset Y (mm)</label>
                <input
                  type="number"
                  value={customOffsetY}
                  onChange={(e) => setCustomOffsetY(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
              <span className="col-span-2 text-[10px] text-amber-600 flex items-center gap-1">
                <Info className="w-3 h-3 flex-shrink-0" />
                You can also click & drag the starting anchor directly on the canvas!
              </span>
            </div>
          )}
        </div>

        {/* 4. OPENINGS & PENETRATIONS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">4</span>
            <h3 className="font-medium text-slate-700 dark:text-slate-200 text-sm">Deductions (Openings/Obstacles)</h3>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Type</label>
                <select
                  value={newOpType}
                  onChange={(e) => setNewOpType(e.target.value as OpeningType)}
                  className="w-full text-slate-800 dark:text-slate-200 text-[11px] p-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                >
                  <option value="Floor Trap">Trap</option>
                  <option value="Column">Column</option>
                  <option value="Door">Doorway</option>
                  <option value="Window">Window</option>
                  <option value="Service Opening">Pipe</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">W (mm)</label>
                <input
                  type="number"
                  value={newOpW}
                  onChange={(e) => setNewOpW(Math.max(10, Number(e.target.value)))}
                  className="w-full text-slate-800 dark:text-slate-200 text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">H/L (mm)</label>
                <input
                  type="number"
                  value={newOpH}
                  onChange={(e) => setNewOpH(Math.max(10, Number(e.target.value)))}
                  className="w-full text-slate-800 dark:text-slate-200 text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                />
              </div>
            </div>
            <button
              onClick={addOpening}
              className="w-full flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Deduction Area
            </button>
          </div>

          {openings.length > 0 ? (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {openings.map((op) => (
                <div key={op.id} className="flex flex-col gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg text-xs relative group">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{op.type}</span>
                    <button
                      onClick={() => removeOpening(op.id)}
                      className="text-slate-400 dark:text-slate-500 hover:text-red-500 rounded p-1 transition-colors"
                      title="Delete deduction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div>
                      <label className="block text-[9px] text-slate-500 dark:text-slate-400">Width</label>
                      <input
                        type="number"
                        value={op.widthMm}
                        onChange={(e) => updateOpening(op.id, "widthMm", Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-1 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 dark:text-slate-400">Height</label>
                      <input
                        type="number"
                        value={op.heightMm}
                        onChange={(e) => updateOpening(op.id, "heightMm", Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-1 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 dark:text-slate-400">X pos</label>
                      <input
                        type="number"
                        value={op.xMm}
                        onChange={(e) => updateOpening(op.id, "xMm", Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-1 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 dark:text-slate-400">Y pos</label>
                      <input
                        type="number"
                        value={op.yMm}
                        onChange={(e) => updateOpening(op.id, "yMm", Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-1 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-400 dark:text-slate-500">
              No deductions added yet. Tiling counts will cover the full net room bounds.
            </div>
          )}
        </div>

        {/* 5. PROCUREMENT WASTAGE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">5</span>
            <h3 className="font-medium text-slate-700 dark:text-slate-200 text-sm">Wastage Buffer</h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
              <span>Suggested Wastage factor</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{suggestedWastagePercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={suggestedWastagePercent}
              onChange={(e) => setSuggestedWastagePercent(Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>0% (Perfect)</span>
              <span>10% (Std)</span>
              <span>20% (Complex)</span>
              <span>30% (Max)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
