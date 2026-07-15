const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add useRef
content = content.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect, useRef } from "react";'
);

// Add Undo, Redo
content = content.replace(
  'Moon, Sun } from "lucide-react";',
  'Moon, Sun, Undo, Redo } from "lucide-react";'
);

const historyLogic = `

  // --- History (Undo/Redo) ---
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const skipHistoryRef = useRef(false);
  const debounceTimerRef = useRef(null);

  const currentState = { roomSpec, tileSpec, openings, startingPoint, customOffsetX, customOffsetY };
  
  const historyRef = useRef([currentState]);
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
`;

// Insert after state definitions
content = content.replace(
  'const [showAIAssistant, setShowAIAssistant] = useState(true);',
  'const [showAIAssistant, setShowAIAssistant] = useState(true);' + historyLogic
);

const undoRedoButtons = `
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 mr-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg shadow-sm">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={\`p-1.5 rounded transition-colors \${
                canUndo 
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800" 
                  : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
              }\`}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={\`p-1.5 rounded transition-colors \${
                canRedo 
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800" 
                  : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
              }\`}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
`;

content = content.replace(
  '{/* Workspace Tabs Toggle */}',
  undoRedoButtons + '\\n          {/* Workspace Tabs Toggle */}'
);

fs.writeFileSync('src/App.tsx', content);
