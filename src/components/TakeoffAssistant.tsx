import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, RoomSpec, TileSpec, Opening } from "../types";
import { Send, Upload, Eraser, Sparkles, Loader2, PenTool, MessageSquare, AlertCircle, Minus, Type } from "lucide-react";

interface TakeoffAssistantProps {
  setRoomSpec: React.Dispatch<React.SetStateAction<RoomSpec>>;
  setTileSpec: React.Dispatch<React.SetStateAction<TileSpec>>;
  setOpenings: React.Dispatch<React.SetStateAction<Opening[]>>;
  addAssumption: (assumption: string) => void;
  setIsIsometric?: (isIso: boolean) => void;
  setIsometricNotes?: (notes: string) => void;
}

const renderMessageText = (text: string, isUser: boolean) => {
  if (!text) return null;
  
  // Split by triple backticks to isolate code blocks
  const parts = text.split("```");
  
  return parts.map((part, index) => {
    // Odd indices represent content inside backticks (code blocks)
    if (index % 2 === 1) {
      // Find the language if any (e.g., "markdown" or "text") and strip it
      const lines = part.split("\n");
      let displayCode = part;
      if (lines.length > 0 && (
        lines[0].trim() === "markdown" || 
        lines[0].trim() === "text" || 
        lines[0].trim() === "ascii" || 
        lines[0].trim() === "css" || 
        lines[0].trim() === "html" || 
        lines[0].trim() === "javascript" || 
        lines[0].trim() === "typescript" || 
        lines[0].trim() === "json"
      )) {
        displayCode = lines.slice(1).join("\n");
      }
      return (
        <pre 
          key={index} 
          className="font-mono text-[10px] sm:text-[11px] bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto whitespace-pre my-2 border border-slate-800 shadow-inner leading-relaxed"
          style={{ letterSpacing: "0.03em" }}
        >
          {displayCode}
        </pre>
      );
    }
    
    // Even indices are standard text
    const lines = part.split("\n");
    return (
      <div key={index} className="space-y-1">
        {lines.map((line, lineIdx) => {
          // Check for bullet points
          const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
          const lineText = isBullet ? line.trim().substring(2) : line;
          
          // Simple bold formatting replacement for **bold**
          const boldParts = lineText.split("**");
          const formattedLine = boldParts.map((boldPart, boldIdx) => {
            if (boldIdx % 2 === 1) {
              return <strong key={boldIdx} className={isUser ? "font-extrabold text-white" : "font-extrabold text-slate-900 dark:text-white"}>{boldPart}</strong>;
            }
            return boldPart;
          });

          if (isBullet) {
            return (
              <div key={lineIdx} className="flex items-start gap-1.5 pl-1.5">
                <span className={isUser ? "text-indigo-200 font-bold" : "text-indigo-500 font-bold"}>•</span>
                <span className="flex-1">{formattedLine}</span>
              </div>
            );
          }
          
          return (
            <p key={lineIdx} className="min-h-[1.25rem]">
              {formattedLine}
            </p>
          );
        })}
      </div>
    );
  });
};

export default function TakeoffAssistant({
  setRoomSpec,
  setTileSpec,
  setOpenings,
  addAssumption,
  setIsIsometric,
  setIsometricNotes,
}: TakeoffAssistantProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "sketch">("chat");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I am your AI Tile Quantity Takeoff Assistant. You can ask me tiling questions, upload a hand sketch or 2D CAD drawing to extract dimensions, or sketch your layout directly in the Sketchboard tab to analyze it with AI!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedMime, setAttachedMime] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Whiteboard Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState<"draw" | "line" | "text">("draw");
  const [drawingStartData, setDrawingStartData] = useState<ImageData | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(3);
  const [sketchAnalysisLoading, setSketchAnalysisLoading] = useState(false);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle standard image attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // strip data url header
      const base64Data = base64.split(",")[1];
      setAttachedImage(base64Data);
      setAttachedMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  // Submit standard chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachedImage) return;

    const userMsgText = chatInput;
    const userMsgImage = attachedImage ? `data:${attachedMime};base64,${attachedImage}` : undefined;
    const currentMime = attachedMime;
    const currentBase64 = attachedImage;

    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userMsgText,
      image: userMsgImage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setAttachedImage(null);
    setAttachedMime(null);
    setIsSending(true);

    try {
      let endpoint = "/api/gemini/chat";
      let payload: any = {
        message: userMsgText,
        history: messages.map((m) => ({ role: m.role, text: m.text })),
      };

      // If user attached an image, route to drawing analyzer
      if (currentBase64) {
        endpoint = "/api/gemini/analyze-drawing";
        payload = {
          image: currentBase64,
          mimeType: currentMime,
          userNotes: userMsgText,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMsg = "Failed to communicate with AI server";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();

      if (currentBase64) {
        // We analyzed a drawing! Apply specifications directly
        applyExtractedSpecs(data);
        
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: `🎨 **Tiling Drawing Takeoff Applied!** I've analyzed your drawing and extracted the following specifications:
          ${data.isIsometric ? `\n\n⚠️ **Isometric (3D) Projection Detected!**\n*This drawing is in isometric/3D projection. I have automatically converted and projected the 3D surface dimensions into flat 2D floor plan coordinates.*\n*Notes: ${data.isometricNotes || "None"}*\n` : ""}
          \n- **Room**: ${data.roomName || "Custom Room"} (${data.roomShape})
          \n- **Dimensions**: ${data.roomDimensions?.widthMm}mm × ${data.roomDimensions?.heightMm}mm
          \n- **Tile**: ${data.tileInfo?.tileSizeMm?.widthMm}mm × ${data.tileInfo?.tileSizeMm?.heightMm}mm (${data.tileInfo?.tileType || "Porcelain"} - ${data.tileInfo?.finish || "Matte"})
          \n- **Grout Width**: ${data.groutWidthMm}mm
          \n- **Deductions**: Found ${data.openings?.length || 0} columns/openings.
          \n- **Assumptions**: ${data.assumptions?.join(", ") || "None"}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Standard chatbot response
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          text: `⚠️ **Error connecting to Gemini:** ${err.message || "Is the GEMINI_API_KEY set in secrets?"}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // WHITEBOARD drawing functionality
  useEffect(() => {
    if (activeTab !== "sketch") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution to match container
    canvas.width = canvas.parentElement?.clientWidth || 500;
    canvas.height = canvas.parentElement?.clientHeight || 400;

    // Fill dark background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid overlays for drawing guidelines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, [activeTab]);

  const startWhiteboardDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingMode === "text") {
      setTextInputPos({ x, y });
      setTimeout(() => textInputRef.current?.focus(), 10);
      return;
    }

    setIsDrawing(true);

    if (drawingMode === "line") {
      setDragStart({ x, y });
      setDrawingStartData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const stopWhiteboardDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (drawingMode === "line") {
      drawOnWhiteboard(e); // final stroke for the line
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.beginPath(); // reset path
    }
  };

  const drawOnWhiteboard = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || drawingMode === "text") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = brushColor;

    if (drawingMode === "line" && drawingStartData) {
      ctx.putImageData(drawingStartData, 0, 0);
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (drawingMode === "draw") {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleTextSubmit = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      setTextInputValue("");
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.font = "16px Inter, sans-serif";
      ctx.fillStyle = brushColor;
      ctx.fillText(textInputValue, textInputPos.x, textInputPos.y);
    }
    setTextInputPos(null);
    setTextInputValue("");
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Re-draw guidelines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  };

  // Submit canvas whiteboard sketch for AI analysis
  const analyzeWhiteboardSketch = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSketchAnalysisLoading(true);
    
    // Get base64 string
    const dataUrl = canvas.toDataURL("image/png");
    const base64Data = dataUrl.split(",")[1];

    try {
      const response = await fetch("/api/gemini/analyze-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Data,
          mimeType: "image/png",
          userNotes: "Analyzing whiteboard hand sketch. Extract room specs and dimensions.",
        }),
      });

      if (!response.ok) {
        let errMsg = "Failed to analyze sketch.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      applyExtractedSpecs(data);

      // Add success response to message list and switch to chat view to see it!
      const successMsg: ChatMessage = {
        id: `ai-sketch-${Date.now()}`,
        role: "assistant",
        text: `🎨 **Sketchboard Specs Extracted!** I have processed your hand-drawn sketch and successfully updated your takeoff model:
        ${data.isIsometric ? `\n\n⚠️ **Isometric (3D) Projection Detected!**\n*This drawing is in isometric/3D projection. I have automatically converted and projected the 3D surface dimensions into flat 2D floor plan coordinates.*\n*Notes: ${data.isometricNotes || "None"}*\n` : ""}
        \n- **Room**: ${data.roomName || "Whiteboard Sketch Room"} (${data.roomShape})
        \n- **Room Bounds**: ${data.roomDimensions?.widthMm}mm × ${data.roomDimensions?.heightMm}mm
        \n- **Tile size**: ${data.tileInfo?.tileSizeMm?.widthMm}mm × ${data.tileInfo?.tileSizeMm?.heightMm}mm (${data.tileInfo?.tileType || "Porcelain"})
        \n- **Grout spacing**: ${data.groutWidthMm}mm
        \n- **Obstacles**: Loaded ${data.openings?.length || 0} deduction areas.
        \n- **Assumptions**: ${data.assumptions?.join(", ") || "Standard surveyor assumptions used."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, successMsg]);
      setActiveTab("chat");
    } catch (err: any) {
      console.error(err);
      alert(`Error analyzing whiteboard sketch: ${err.message || "Failed"}`);
    } finally {
      setSketchAnalysisLoading(false);
    }
  };

  // Utility to apply extracted parameters directly into state
  const applyExtractedSpecs = (data: any) => {
    if (setIsIsometric) {
      setIsIsometric(!!data.isIsometric);
    }
    if (setIsometricNotes) {
      setIsometricNotes(data.isometricNotes || "");
    }

    if (data.roomDimensions?.widthMm) {
      setRoomSpec({
        shape: (data.roomShape === "L-Shape" || data.roomShape === "L-shape") ? "L-Shape" : "Rectangular",
        widthMm: Number(data.roomDimensions.widthMm),
        heightMm: Number(data.roomDimensions.heightMm),
        indentWidthMm: Number(data.roomDimensions.indentWidthMm || 1200),
        indentHeightMm: Number(data.roomDimensions.indentHeightMm || 1200),
      });
    }

    if (data.tileInfo?.tileSizeMm?.widthMm) {
      setTileSpec((prev) => ({
        ...prev,
        widthMm: Number(data.tileInfo.tileSizeMm.widthMm),
        heightMm: Number(data.tileInfo.tileSizeMm.heightMm),
        tileType: data.tileInfo.tileType || "Porcelain",
        finish: data.tileInfo.finish || "Matte",
        pattern: (data.tileInfo.layingPattern === "Brick Bond" || data.tileInfo.layingPattern === "Diagonal") 
          ? data.tileInfo.layingPattern 
          : "Straight",
        orientation: data.tileInfo.orientation === "Landscape" ? "Landscape" : "Portrait",
      }));
    }

    if (data.groutWidthMm !== undefined) {
      setTileSpec((prev) => ({ ...prev, groutWidthMm: Number(data.groutWidthMm) }));
    }

    if (data.openings && Array.isArray(data.openings)) {
      const mappedOpenings: Opening[] = data.openings.map((op: any, i: number) => ({
        id: `ai-op-${i}-${Date.now()}`,
        type: op.type || "Column",
        widthMm: Number(op.widthMm),
        heightMm: Number(op.heightMm),
        xMm: Number(op.xMm || 1000),
        yMm: Number(op.yMm || 1000),
      }));
      setOpenings(mappedOpenings);
    }

    if (data.assumptions && Array.isArray(data.assumptions)) {
      data.assumptions.forEach((ass: string) => addAssumption(ass));
    }
  };

  return (
    <div className="w-[420px] bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full overflow-hidden" id="takeoff-assistant-panel">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 gap-1.5 flex-shrink-0">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all border ${
            activeTab === "chat"
              ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
              : "border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> AI QS Assistant
        </button>
        <button
          onClick={() => setActiveTab("sketch")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all border ${
            activeTab === "sketch"
              ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
              : "border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" /> CAD Sketchboard
        </button>
      </div>

      {/* TAB CONTENT: CHAT */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] dark:bg-slate-950">
          {/* Scrollable messages thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Attachment"
                      className="max-h-[160px] rounded-lg mb-2 object-cover border border-indigo-100 dark:border-indigo-800"
                    />
                  )}
                  {/* Handle formatting and code blocks for beautiful ASCII maps */}
                  <div className="text-xs leading-relaxed space-y-1">
                    {renderMessageText(msg.text, msg.role === "user")}
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions/prompts for Tile Installation Visualization */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 flex-shrink-0" id="chat-quick-suggestions">
            <button
              type="button"
              onClick={() => setChatInput("Generate an ASCII text map and installation visual diagram for a 3000x2000mm room with 600x600mm tiles in standard grid.")}
              className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-[10px] font-semibold transition-all shadow-sm"
            >
              🗺️ Grid Layout Map
            </button>
            <button
              type="button"
              onClick={() => setChatInput("Draw an ASCII layout diagram for running bond/offset pattern showing installation arrows.")}
              className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-[10px] font-semibold transition-all shadow-sm"
            >
              🧱 Offset Brick Map
            </button>
            <button
              type="button"
              onClick={() => setChatInput("How do I avoid narrow tile cuts on walls? Show starting point on an ASCII layout diagram.")}
              className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-[10px] font-semibold transition-all shadow-sm"
            >
              ✂️ Avoid Narrow Slivers
            </button>
          </div>

          {/* Form inputs */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm">
            {/* Attachment preview if any */}
            {attachedImage && (
              <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-white dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img
                      src={`data:${attachedMime};base64,${attachedImage}`}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Drawing attached ready to Analyze</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedImage(null);
                    setAttachedMime(null);
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-red-500 text-xs font-semibold px-2"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition-all border border-slate-200/50"
                title="Upload drawing image (PNG, JPG)"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={attachedImage ? "Add prompts/notes about drawing..." : "Ask me anything or upload specs..."}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />

              <button
                type="submit"
                disabled={isSending}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-all shadow-sm"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: SKETCHBOARD */}
      {activeTab === "sketch" && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 relative">
          {/* Canvas workspace */}
          <div className="flex-1 relative min-h-0 bg-slate-950">
            <canvas
              ref={canvasRef}
              onMouseDown={startWhiteboardDrawing}
              onMouseUp={stopWhiteboardDrawing}
              onMouseLeave={stopWhiteboardDrawing}
              onMouseMove={drawOnWhiteboard}
              className={`absolute inset-0 w-full h-full touch-none ${
                drawingMode === "text" ? "cursor-text" : "cursor-crosshair"
              }`}
            />
            {textInputPos && (
              <input
                ref={textInputRef}
                type="text"
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                onBlur={handleTextSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTextSubmit();
                }}
                className="absolute bg-transparent text-white border border-indigo-500 rounded px-1 outline-none font-sans text-base z-10"
                style={{
                  left: textInputPos.x,
                  top: textInputPos.y - 10,
                  color: brushColor,
                }}
                placeholder="Type here..."
              />
            )}
          </div>

          {/* Canvas Toolbar Controls */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 shadow-sm overflow-x-auto gap-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setDrawingMode("draw")}
                  className={`p-1.5 rounded-md transition-all ${
                    drawingMode === "draw" ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-200"
                  }`}
                  title="Freehand Draw"
                >
                  <PenTool className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDrawingMode("line")}
                  className={`p-1.5 rounded-md transition-all ${
                    drawingMode === "line" ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-200"
                  }`}
                  title="Straight Line"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDrawingMode("text")}
                  className={`p-1.5 rounded-md transition-all ${
                    drawingMode === "text" ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-200"
                  }`}
                  title="Add Text"
                >
                  <Type className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={clearWhiteboard}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200/50"
                title="Clear sketchboard"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>

              {/* Color selectors */}
              <div className="flex gap-1.5 items-center">
                {["#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#eab308"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setBrushColor(c)}
                    className={`w-4 h-4 rounded-full border transition-all ${
                      brushColor === c ? "scale-125 border-slate-400 ring-1 ring-indigo-500" : "border-slate-800"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={analyzeWhiteboardSketch}
              disabled={sketchAnalysisLoading}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {sketchAnalysisLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Analyze with AI
                </>
              )}
            </button>
          </div>

          {/* Visual Guideline alert */}
          <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Draw a simple floor outline, write dimensions (e.g. 5000x3000), and let AI parse it!</span>
          </div>
        </div>
      )}
    </div>
  );
}
