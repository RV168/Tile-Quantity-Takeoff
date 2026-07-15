import React, { useState, useEffect, useRef } from "react";
import { RoomSpec, TileSpec, Opening, StartingPoint, Project, LayoutResult } from "./types";
import { performTakeoff } from "./utils/tilingCalc";
import SpecSidebar from "./components/SpecSidebar";
import LayoutCanvas from "./components/LayoutCanvas";
import TakeoffAssistant from "./components/TakeoffAssistant";
import TakeoffReport from "./components/TakeoffReport";
import ProjectHistory from "./components/ProjectHistory";
import { LayoutGrid, FileText, Sparkles, Sliders, FolderClosed, Menu, ChevronLeft, ChevronRight, Calculator, RefreshCw, Moon, Sun, Undo, Redo } from "lucide-react";

export default function App() {
  // 1. Core specs state
  const [roomSpec, setRoomSpec] = useState<RoomSpec>({
    shape: "Rectangular",
    widthMm: 4000,
    heightMm: 3000,
    indentWidthMm: 1200,
    indentHeightMm: 1200,
  });

  const [tileSpec, setTileSpec] = useState<TileSpec>({
    widthMm: 600,
    heightMm: 600,
    thicknessMm: 10,
    tileType: "Porcelain",
    material: "Refined Clay",
    finish: "Matte",
    orientation: "Portrait",
    pattern: "Straight",
    groutWidthMm: 3,
    perimeterJointMm: 6,
  });

  const [openings, setOpenings] = useState<Opening[]>([]);
  const [startingPoint, setStartingPoint] = useState<StartingPoint>("Center");
  const [customOffsetX, setCustomOffsetX] = useState(0);
  const [customOffsetY, setCustomOffsetY] = useState(0);
  const [suggestedWastagePercent, setSuggestedWastagePercent] = useState(10);
  const [assumptions, setAssumptions] = useState<string[]>([
    "Initial calculation assuming standard vertical portrait layout orientation.",
    "Calculations include grout joint widths in spacing intervals.",
    "Perimeter joints of 6mm applied along walls to accommodate expansion.",
  ]);

  // Project information metadata
  const [projectName, setProjectName] = useState("Bathroom Suite Floor");
  const [drawingName, setDrawingName] = useState("A-101 Blueprint Draft.pdf");
  const [isIsometric, setIsIsometric] = useState(false);
  const [isometricNotes, setIsometricNotes] = useState("");

  // 2. Active Tab & collateral UI state
  const [activeTab, setActiveTab] = useState<"canvas" | "report">("canvas");
  const [showProjectsPanel, setShowProjectsPanel] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(true);

  // --- History (Undo/Redo) ---
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const skipHistoryRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentState = { roomSpec, tileSpec, openings, startingPoint, customOffsetX, customOffsetY };
  
  const historyRef = useRef<typeof currentState[]>([currentState]);
  const historyIndexRef = useRef(0);

  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const history = historyRef.current;
      const index = historyIndexRef.current;
      const lastSaved = history[index];
      
      if (JSON.stringify(lastSaved) !== JSON.stringify(currentState)) {
        const newHistory = history.slice(0, index + 1);
        newHistory.push(currentState);
        if (newHistory.length > 50) newHistory.shift();
        
        historyRef.current = newHistory;
        historyIndexRef.current = newHistory.length - 1;
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    }
  }, [roomSpec, tileSpec, openings, startingPoint, customOffsetX, customOffsetY]);

  const handleUndo = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    const history = historyRef.current;
    let index = historyIndexRef.current;
    
    if (JSON.stringify(history[index]) !== JSON.stringify(currentState)) {
        // Unsaved changes, revert to history[index]
    } else if (index > 0) {
        index -= 1;
        historyIndexRef.current = index;
    } else {
        return;
    }

    skipHistoryRef.current = true;
    const prevState = history[index];
    setRoomSpec(prevState.roomSpec);
    setTileSpec(prevState.tileSpec);
    setOpenings(prevState.openings);
    setStartingPoint(prevState.startingPoint);
    setCustomOffsetX(prevState.customOffsetX);
    setCustomOffsetY(prevState.customOffsetY);
    
    setCanUndo(index > 0);
    setCanRedo(index < history.length - 1);
  };

  const handleRedo = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    const history = historyRef.current;
    let index = historyIndexRef.current;
    
    if (index < history.length - 1) {
      index += 1;
      historyIndexRef.current = index;
      
      skipHistoryRef.current = true;
      const nextState = history[index];
      setRoomSpec(nextState.roomSpec);
      setTileSpec(nextState.tileSpec);
      setOpenings(nextState.openings);
      setStartingPoint(nextState.startingPoint);
      setCustomOffsetX(nextState.customOffsetX);
      setCustomOffsetY(nextState.customOffsetY);
      
      setCanUndo(index > 0);
      setCanRedo(index < history.length - 1);
    }
  };
  // ---------------------------

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check system preference on initial load
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // 3. Compute takeoff calculations in real-time
  const [layoutResult, setLayoutResult] = useState<LayoutResult>(() =>
    performTakeoff(roomSpec, tileSpec, openings, startingPoint, customOffsetX, customOffsetY)
  );

  useEffect(() => {
    const res = performTakeoff(roomSpec, tileSpec, openings, startingPoint, customOffsetX, customOffsetY);
    setLayoutResult(res);
  }, [roomSpec, tileSpec, openings, startingPoint, customOffsetX, customOffsetY]);

  // Handle loading project
  const handleLoadProject = (proj: Project) => {
    setProjectName(proj.name);
    setDrawingName(proj.drawingName);
    setRoomSpec(proj.roomSpec);
    setTileSpec(proj.tileSpec);
    setOpenings(proj.openings);
    setStartingPoint(proj.startingPoint);
    setCustomOffsetX(proj.customOffsetX);
    setCustomOffsetY(proj.customOffsetY);
    setSuggestedWastagePercent(proj.suggestedWastagePercent);
    setAssumptions(proj.assumptions);
    setIsIsometric(proj.isIsometric || false);
    setIsometricNotes(proj.isometricNotes || "");
  };

  const addAssumption = (ass: string) => {
    if (!assumptions.includes(ass)) {
      setAssumptions((prev) => [...prev, ass]);
    }
  };

  // Compile active project metadata for saving
  const currentProject: Project = {
    id: "active",
    name: projectName,
    clientName: "Tender Draft",
    drawingName: drawingName,
    date: new Date().toLocaleDateString(),
    roomSpec,
    tileSpec,
    openings,
    startingPoint,
    customOffsetX,
    customOffsetY,
    suggestedWastagePercent,
    assumptions,
    isIsometric,
    isometricNotes,
  };

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 overflow-hidden" id="takeoff-workspace-root">
      
      {/* GLOBAL WORKSPACE HEADER BANNER */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 flex-shrink-0 select-none shadow-sm">
        
        {/* Left side brand logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white font-black tracking-tight text-base shadow-sm">
            T
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-tight">AI TILE QUANTITY TAKEOFF</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-mono">Quantity Surveyor Workstation v1.2</p>
          </div>
        </div>

        {/* Central Live Takeoff Stats display */}
        <div className="hidden lg:flex items-center gap-6 bg-slate-50 dark:bg-slate-800 py-1.5 px-5 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono">Net Area:</span>
            <span className="font-extrabold text-slate-800 dark:text-white">{layoutResult.netAreaM2} m²</span>
          </div>
          <span className="text-slate-200 dark:text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono">Net Tiles:</span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{layoutResult.totalTilesRequired} pcs</span>
          </div>
          <span className="text-slate-200 dark:text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono">Total (+{suggestedWastagePercent}% Waste):</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              {Math.ceil(layoutResult.totalTilesRequired * (1 + suggestedWastagePercent / 100))} pcs
            </span>
          </div>
        </div>

        {/* Right side Controls / Navigation tabs */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-colors border ${
              isDarkMode ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-sm" : "border-slate-200 text-slate-600 hover:text-slate-950 bg-white shadow-sm"
            }`}
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></span>

          
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 mr-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg shadow-sm">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors ${
                canUndo 
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800" 
                  : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
              }`}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${
                canRedo 
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800" 
                  : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
              }`}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace Tabs Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setActiveTab("canvas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeTab === "canvas"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Interactive CAD
            </button>
            <button
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeTab === "report"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Quantity Ledger
            </button>
          </div>

          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></span>

          {/* Toggle buttons for side panels */}
          <button
            onClick={() => setShowProjectsPanel(!showProjectsPanel)}
            className={`p-2 rounded-lg transition-colors border ${
              showProjectsPanel 
                ? "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm" 
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-800 shadow-sm"
            }`}
            title="Toggle projects explorer"
          >
            <FolderClosed className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className={`p-2 rounded-lg transition-colors border ${
              showAIAssistant 
                ? "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm" 
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-800 shadow-sm"
            }`}
            title="Toggle AI panel"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE INTERFACE */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* PANEL 1: COLLAPSIBLE PROJECTS EXPLORER */}
        {showProjectsPanel && (
          <div className="h-full flex-shrink-0 border-r border-slate-200 dark:border-slate-800 transition-all z-10 bg-white dark:bg-slate-900">
            <ProjectHistory
              currentRoom={roomSpec}
              currentTile={tileSpec}
              currentOpenings={openings}
              currentStartingPoint={startingPoint}
              customOffsetX={customOffsetX}
              customOffsetY={customOffsetY}
              suggestedWastage={suggestedWastagePercent}
              assumptions={assumptions}
              loadProject={handleLoadProject}
            />
          </div>
        )}

        {/* PANEL 2 & 3: CENTRAL WORK AREA (Specs + Workspace Canvas/Report) */}
        <div className="flex-1 flex min-w-0 h-full">
          
          {/* Spec Sidebar (Always visible in Canvas workspace, or when report is open to easily adjust) */}
          <div className="w-[340px] flex-shrink-0 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <SpecSidebar
              roomSpec={roomSpec}
              setRoomSpec={setRoomSpec}
              tileSpec={tileSpec}
              setTileSpec={setTileSpec}
              openings={openings}
              setOpenings={setOpenings}
              startingPoint={startingPoint}
              setStartingPoint={setStartingPoint}
              customOffsetX={customOffsetX}
              setCustomOffsetX={setCustomOffsetX}
              customOffsetY={customOffsetY}
              setCustomOffsetY={setCustomOffsetY}
              suggestedWastagePercent={suggestedWastagePercent}
              setSuggestedWastagePercent={setSuggestedWastagePercent}
            />
          </div>

          {/* Central Main Viewport */}
          <div className="flex-1 flex flex-col h-full min-w-0 bg-[#F1F5F9] dark:bg-slate-950 relative">
            {activeTab === "canvas" ? (
              <LayoutCanvas
                roomSpec={roomSpec}
                tileSpec={tileSpec}
                openings={openings}
                setOpenings={setOpenings}
                startingPoint={startingPoint}
                setStartingPoint={setStartingPoint}
                customOffsetX={customOffsetX}
                setCustomOffsetX={setCustomOffsetX}
                customOffsetY={customOffsetY}
                setCustomOffsetY={setCustomOffsetY}
                layoutResult={layoutResult}
                isIsometric={isIsometric}
                isometricNotes={isometricNotes}
                isDarkMode={isDarkMode}
              />
            ) : (
              <TakeoffReport
                project={currentProject}
                layoutResult={layoutResult}
                assumptions={assumptions}
                setAssumptions={setAssumptions}
              />
            )}
          </div>
        </div>

        {/* PANEL 4: COLLAPSIBLE AI ASSISTANT PANEL */}
        {showAIAssistant && (
          <div className="h-full flex-shrink-0 border-l border-slate-200 dark:border-slate-800 transition-all z-10 bg-white dark:bg-slate-900">
            <TakeoffAssistant
              setRoomSpec={setRoomSpec}
              setTileSpec={setTileSpec}
              setOpenings={setOpenings}
              addAssumption={addAssumption}
              setIsIsometric={setIsIsometric}
              setIsometricNotes={setIsometricNotes}
            />
          </div>
        )}

      </div>
    </div>
  );
}
