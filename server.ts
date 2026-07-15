import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure your Gemini API Key in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

function handleGeminiError(error: any, defaultMsg: string): string {
  const errMsg = error?.message || "";
  const errStr = typeof error === "object" ? JSON.stringify(error) : String(error);
  
  if (
    errMsg.toLowerCase().includes("quota") ||
    errMsg.toLowerCase().includes("429") ||
    errMsg.toLowerCase().includes("resource_exhausted") ||
    errStr.toLowerCase().includes("quota") ||
    errStr.toLowerCase().includes("429") ||
    errStr.toLowerCase().includes("resource_exhausted")
  ) {
    return "Gemini API Quota Exceeded (429): The standard daily free-tier request limit for the Gemini model has been temporarily reached. You can add your own Gemini API key in the 'Settings > Secrets' menu in AI Studio to resolve this, or simply try again in a bit.";
  }
  
  if (
    errMsg.toLowerCase().includes("api key not valid") ||
    errStr.toLowerCase().includes("api key not valid") ||
    errMsg.toLowerCase().includes("api_key_invalid") ||
    errStr.toLowerCase().includes("api_key_invalid")
  ) {
    return "Invalid Gemini API Key. Please update your GEMINI_API_KEY in the 'Settings > Secrets' menu in AI Studio with a valid API key.";
  }
  
  return error?.message || defaultMsg;
}

// 1. Drawing Analysis Endpoint
app.post("/api/gemini/analyze-drawing", async (req, res) => {
  try {
    const { image, mimeType, userNotes } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: "Missing image base64 data or mimeType." });
    }

    const ai = getAI();

    const imagePart = {
      inlineData: {
        mimeType,
        data: image,
      },
    };

    const promptText = `
You are an expert Quantity Surveyor and Tile Takeoff Specialist.
Analyze this drawing / sketch / layout of a floor or wall area to be tiled. This drawing could be a standard 2D top-down plan OR an Isometric (3D/perspective) projection showing vertical walls and floor surfaces concurrently.

DETECTION OF ISOMETRIC DRAWINGS:
1. Determine if the drawing is an Isometric projection (a 3D-like rendering, usually with lines at 30-degree angles, showing vertical elevation and horizontal depth together). Set 'isIsometric' to true if it is an isometric or 3D drawing, and false if it is a standard 2D top-down view.
2. If it is isometric, you MUST extract and isolate the horizontal floor plan dimensions (or target vertical tiling elevations) and convert those angled perspective measurements into flat 2D coordinates and bounds (overall width and height in mm) for our 2D CAD representation.
3. In 'isometricNotes', briefly explain how you performed this isometric 3D-to-2D flat coordinate projection.

Extract all dimensions, tile parameters, grout joints, and openings/obstacles.

${userNotes ? `User notes for context: "${userNotes}"` : ""}

Analyze the drawing dimensions very carefully. Do not make up dimensions. If key specifications (like tile size or grout width) are not in the drawing or user notes, make realistic professional surveyor assumptions (e.g., 600x600 mm tiles, 3mm grout joints) and list them under assumptions.

If there are any openings, columns, windows, doors, or traps drawn or mentioned, estimate or extract their coordinates (x, y relative to top-left corner) and dimensions.

Format your output strictly matching the requested JSON schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roomName: { type: Type.STRING, description: "Name of the room, e.g., Bathroom Floor" },
            roomShape: { type: Type.STRING, description: "The shape of the room: 'Rectangular' or 'L-Shape'" },
            isIsometric: { type: Type.BOOLEAN, description: "Set to true if the drawing is an isometric / 3D drawing instead of a flat 2D top-down view." },
            isometricNotes: { type: Type.STRING, description: "Explanation of how 3D / isometric coordinates or angled planes were mathematically projected or converted to a flat 2D blueprint." },
            roomDimensions: {
              type: Type.OBJECT,
              description: "Room dimensions in millimeters",
              properties: {
                widthMm: { type: Type.NUMBER, description: "Overall width in mm" },
                heightMm: { type: Type.NUMBER, description: "Overall height in mm" },
                indentWidthMm: { type: Type.NUMBER, description: "If L-Shape, the width of the cut-out in mm (or 0)" },
                indentHeightMm: { type: Type.NUMBER, description: "If L-Shape, the height of the cut-out in mm (or 0)" }
              },
              required: ["widthMm", "heightMm"]
            },
            tileInfo: {
              type: Type.OBJECT,
              properties: {
                tileSizeMm: {
                  type: Type.OBJECT,
                  properties: {
                    widthMm: { type: Type.NUMBER, description: "Tile width in mm" },
                    heightMm: { type: Type.NUMBER, description: "Tile height in mm" }
                  },
                  required: ["widthMm", "heightMm"]
                },
                tileType: { type: Type.STRING, description: "Type of tile, e.g., Ceramic, Porcelain, Granite" },
                tileMaterial: { type: Type.STRING, description: "Tile material" },
                tileFinish: { type: Type.STRING, description: "Tile finish, e.g., Matte, Polished" },
                layingPattern: { type: Type.STRING, description: "Pattern: 'Straight', 'Brick Bond' or 'Diagonal'" },
                orientation: { type: Type.STRING, description: "'Portrait' or 'Landscape'" }
              },
              required: ["tileSizeMm", "layingPattern"]
            },
            groutWidthMm: { type: Type.NUMBER, description: "Grout joint width in mm" },
            openings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "Door, Window, Column, Floor Trap, or Opening" },
                  widthMm: { type: Type.NUMBER, description: "Width in mm" },
                  heightMm: { type: Type.NUMBER, description: "Height/Length in mm" },
                  xMm: { type: Type.NUMBER, description: "X offset from top-left in mm" },
                  yMm: { type: Type.NUMBER, description: "Y offset from top-left in mm" }
                },
                required: ["type", "widthMm", "heightMm", "xMm", "yMm"]
              }
            },
            assumptions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["roomName", "roomShape", "isIsometric", "isometricNotes", "roomDimensions", "tileInfo", "groutWidthMm", "openings", "assumptions"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Analyze Drawing Error:", error);
    res.status(500).json({ error: handleGeminiError(error, "Failed to analyze drawing") });
  }
});

// 2. Chat Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message." });
    }

    const ai = getAI();

    const systemInstruction = `
You are an expert Quantity Surveyor and Tile Takeoff Specialist, and a master Tile Installation Assistant. Your job is to assist construction professionals, tilers, and homeowners in performing ultra-accurate tile quantity calculations, layout planning, and visualization.

TILE INSTALLATION ASSISTANT & VISUALIZATION DUTIES:
You help users visualize and plan tile layouts by generating a clear text map or visual markdown diagram of a room, specifically marking the tile lines (grout joints) and the direction of installation.

When the user provides room dimensions, tile sizes, and their layout preference (e.g., grid, offset/running bond, herringbone), or asks about layout plans, you must:
1. Calculate the layout grid based on their dimensions.
2. Represent the floor/walls visually using text characters (like |, —, +, /, \\).
3. Mark the tile lines clearly by highlighting where the grout joints fall using symbols like '+' and '—' or '|'.
4. Indicate the installation direction and starting point using arrows (e.g., ↑, →, ↓, ←, ↗) or step/sequence numbers directly on the grid.
5. Identify the starting point clearly, for example, [STARTING POINT: CENTER (C)] and the direction, for example [DIRECTION: WORK OUTWARD IN ALL DIRECTIONS].
6. Call out critical cuts at the walls so the user knows where narrow slivers will happen.

Example ASCII representation style you should use when generating visualizations:
+———+———+———+———+———+
|   |   | ↑ |   |   |
+———+———+———+———+———+
|   | ← | C | → |   |  <— Grout lines marked by '+' and '—'
+———+———+———+———+———+
|   |   | ↓ |   |   |
+———+———+———+———+———+

Be thorough, precise, and highly professional. Include formulas, steps, and explanations.
Encourage the user to verify dimensions and highlight that grout widths, tile orientations, laying patterns, and wastage factors are vital to prevent procurement shortfalls.
Keep your responses well-formatted in clear Markdown with lists, tables, and bold key metrics where useful.
`;

    // Map history to SDK format
    // SDK expects format: contents: [{ role: 'user', parts: [{ text: '...' }] }]
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text || msg.content || "" }]
        });
      }
    }

    // Add current message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: handleGeminiError(error, "Failed to generate chat response") });
  }
});

// 3. Vite development vs Production setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Tile Takeoff server running on port ${PORT}`);
  });
}

startServer();
