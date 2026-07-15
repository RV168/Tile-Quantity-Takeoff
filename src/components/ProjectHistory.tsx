import React, { useState, useEffect } from "react";
import { Project, RoomSpec, TileSpec, Opening, StartingPoint } from "../types";
import { FolderOpen, Save, Trash2, Plus, Clock, HardDrive } from "lucide-react";

interface ProjectHistoryProps {
  currentRoom: RoomSpec;
  currentTile: TileSpec;
  currentOpenings: Opening[];
  currentStartingPoint: StartingPoint;
  customOffsetX: number;
  customOffsetY: number;
  suggestedWastage: number;
  assumptions: string[];
  loadProject: (project: Project) => void;
}

export default function ProjectHistory({
  currentRoom,
  currentTile,
  currentOpenings,
  currentStartingPoint,
  customOffsetX,
  customOffsetY,
  suggestedWastage,
  assumptions,
  loadProject,
}: ProjectHistoryProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [saveName, setSaveName] = useState("");

  // Load from local storage
  useEffect(() => {
    const stored = localStorage.getItem("tile-takeoff-projects");
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading local projects", e);
      }
    } else {
      // Seed default project
      const seed: Project[] = [
        {
          id: "seed-1",
          name: "Ensuite Bathroom Floor",
          clientName: "Private Client",
          drawingName: "A-102 Bathroom Layout.pdf",
          date: new Date().toLocaleDateString(),
          roomSpec: { shape: "Rectangular", widthMm: 3500, heightMm: 2800, indentWidthMm: 0, indentHeightMm: 0 },
          tileSpec: {
            widthMm: 300,
            heightMm: 300,
            thicknessMm: 8,
            tileType: "Ceramic",
            material: "Porcelain Clay",
            finish: "Matte",
            orientation: "Portrait",
            pattern: "Straight",
            groutWidthMm: 2,
            perimeterJointMm: 5,
          },
          openings: [
            { id: "seed-op-1", type: "Floor Trap", widthMm: 200, heightMm: 200, xMm: 1200, yMm: 1200 },
          ],
          startingPoint: "Center",
          customOffsetX: 0,
          customOffsetY: 0,
          suggestedWastagePercent: 10,
          assumptions: ["Standard 2mm grout joint applied.", "Floor trap area deducted from net tiling."],
        },
      ];
      setProjects(seed);
      localStorage.setItem("tile-takeoff-projects", JSON.stringify(seed));
    }
  }, []);

  const saveCurrentProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: saveName.trim(),
      clientName: "Tender Draft",
      drawingName: "Active Takeoff Sketch",
      date: new Date().toLocaleDateString(),
      roomSpec: currentRoom,
      tileSpec: currentTile,
      openings: currentOpenings,
      startingPoint: currentStartingPoint,
      customOffsetX,
      customOffsetY,
      suggestedWastagePercent: suggestedWastage,
      assumptions,
    };

    const updated = [newProject, ...projects];
    setProjects(updated);
    localStorage.setItem("tile-takeoff-projects", JSON.stringify(updated));
    setSaveName("");
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent loading
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    localStorage.setItem("tile-takeoff-projects", JSON.stringify(updated));
  };

  return (
    <div className="w-[280px] bg-slate-50/90 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full overflow-hidden" id="project-history-panel">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-2 flex-shrink-0">
        <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">QS Workspace Directory</h2>
      </div>

      {/* Save project form */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <form onSubmit={saveCurrentProject} className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Save Current Takeoff</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Master Suite Floor"
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
              title="Save project"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Directory File Explorer list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 scrollbar-thin">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Local Ledger History</span>

        {projects.length > 0 ? (
          <div className="space-y-1.5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => loadProject(proj)}
                className="group flex items-start justify-between p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 rounded-lg cursor-pointer transition-all shadow-sm"
              >
                <div className="space-y-0.5 max-w-[85%]">
                  <span className="font-medium text-slate-700 dark:text-slate-200 text-xs block truncate">{proj.name}</span>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>{proj.date}</span>
                    <span>•</span>
                    <span>{proj.tileSpec.widthMm}x{proj.tileSpec.heightMm} mm</span>
                  </div>
                </div>
                <button
                  onClick={(e) => deleteProject(proj.id, e)}
                  className="text-slate-400 dark:text-slate-500 hover:text-red-600 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete takeoff ledger"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
            <HardDrive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span>Workspace directory is empty. Save your takeoffs to recall them anytime.</span>
          </div>
        )}
      </div>

      {/* Workspace specifications footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between flex-shrink-0">
        <span>Files saved in browser storage</span>
        <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">OFFLINE SECURE</span>
      </div>
    </div>
  );
}
