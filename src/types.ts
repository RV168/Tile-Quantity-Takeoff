export type RoomShape = "Rectangular" | "L-Shape" | "U-Shape" | "Triangle" | "Circular" | "Octagon";

export type LayingPattern = 
  | "Straight" 
  | "Stack Bond"
  | "Brick Bond" 
  | "Quarter Bond"
  | "One-Third Bond"
  | "Basketweave"
  | "Diagonal" 
  | "Herringbone"
  | "Radial Cobblestone";

export type TileOrientation = "Portrait" | "Landscape";

export type StartingPoint = "Center" | "Top-Left" | "Top-Right" | "Bottom-Left" | "Bottom-Right" | "Custom";

export type OpeningType = "Door" | "Window" | "Column" | "Floor Trap" | "Service Opening" | "Other";

export interface TileSpec {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  tileType: string;
  material: string;
  finish: string;
  orientation: TileOrientation;
  pattern: LayingPattern;
  groutWidthMm: number;
  perimeterJointMm: number;
}

export interface RoomSpec {
  shape: RoomShape;
  widthMm: number;
  heightMm: number;
  indentWidthMm: number; // for L-shape cutout width from bottom-right (or top-right)
  indentHeightMm: number; // for L-shape cutout height from bottom-right (or top-right)
}

export interface Opening {
  id: string;
  type: OpeningType;
  shape?: "Rectangular" | "Circular";
  widthMm: number;
  heightMm: number;
  xMm: number; // relative to room top-left
  yMm: number; // relative to room top-left
}

export interface CalculatedTile {
  id: string;
  row: number;
  col: number;
  // World coordinates of the full base tile
  x: number;
  y: number;
  w: number;
  h: number;
  // Sliced polygon/bounds coordinates inside the room boundary
  isInside: boolean;
  isPartial: boolean;
  isOpeningCut: boolean;
  areaFraction: number; // 0 to 1
  cutWidthMm: number;
  cutHeightMm: number;
  // If partial, can we salvage?
  reusable: boolean;
  rotation?: number; // in degrees
}

export interface LayoutResult {
  fullTiles: number;
  partialTiles: number;
  totalTilesRequired: number;
  reusableOffcuts: number;
  netAreaM2: number;
  grossAreaM2: number;
  tiles: CalculatedTile[];
  numRows: number;
  numCols: number;
  edgeCuts: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  cornerCuts: number;
  largestCutMm2: number;
  smallestCutMm2: number;
  largestCutDim: { w: number; h: number };
  smallestCutDim: { w: number; h: number };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  image?: string; // base64 representation of attached sketch/file
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  drawingName: string;
  date: string;
  roomSpec: RoomSpec;
  tileSpec: TileSpec;
  openings: Opening[];
  startingPoint: StartingPoint;
  customOffsetX: number;
  customOffsetY: number;
  suggestedWastagePercent: number;
  assumptions: string[];
  isIsometric?: boolean;
  isometricNotes?: string;
}
