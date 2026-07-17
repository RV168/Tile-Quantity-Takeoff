import {
  RoomSpec,
  TileSpec,
  Opening,
  LayoutResult,
  CalculatedTile,
  StartingPoint,
} from "../types";

/**
 * Checks if a point is inside the room boundary
 */
export function isPointInRoom(x: number, y: number, room: RoomSpec): boolean {
  const { widthMm: W, heightMm: H, shape, indentWidthMm: IW, indentHeightMm: IH } = room;

  // Point must be within overall bounding box
  if (x < 0 || x > W || y < 0 || y > H) {
    return false;
  }

  // If L-Shape, the bottom-right corner is cut out
  if (shape === "L-Shape") {
    const cutoutX = W - IW;
    const cutoutY = H - IH;
    if (x > cutoutX && y > cutoutY) {
      return false;
    }
  } else if (shape === "U-Shape") {
    // Cut out top-middle. Let's assume cutout is center top.
    // Using indentWidthMm and indentHeightMm as the cutout size
    const cutoutStartX = (W - IW) / 2;
    const cutoutEndX = cutoutStartX + IW;
    const cutoutEndY = IH;
    if (x > cutoutStartX && x < cutoutEndX && y < cutoutEndY) {
      return false;
    }
  } else if (shape === "Triangle") {
    // Isosceles triangle pointing up: (W/2, 0) to (0, H) and (W, H)
    // Left edge: x >= (W/2) * (1 - y/H)
    // Right edge: x <= (W/2) * (1 + y/H)
    const leftBound = (W / 2) * (1 - y / H);
    const rightBound = (W / 2) * (1 + y / H);
    if (x < leftBound || x > rightBound) {
      return false;
    }
  } else if (shape === "Circular") {
    // Ellipse in the center
    const cx = W / 2;
    const cy = H / 2;
    const rx = W / 2;
    const ry = H / 2;
    // (x-cx)^2 / rx^2 + (y-cy)^2 / ry^2 <= 1
    const dx = x - cx;
    const dy = y - cy;
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1) {
      return false;
    }
  } else if (shape === "Octagon") {
    // Cut off the 4 corners. Let corner size be C = min(W, H) / 3
    const c = Math.min(W, H) / 3.414; // Approximate regular octagon if W=H
    // Top-left corner
    if (x + y < c) return false;
    // Top-right corner
    if ((W - x) + y < c) return false;
    // Bottom-left corner
    if (x + (H - y) < c) return false;
    // Bottom-right corner
    if ((W - x) + (H - y) < c) return false;
  }

  return true;
}

/**
 * Checks if a point is inside any of the openings
 */
export function isPointInOpenings(x: number, y: number, openings: Opening[]): boolean {
  for (const op of openings) {
    if (op.shape === "Circular") {
      const cx = op.xMm + op.widthMm / 2;
      const cy = op.yMm + op.heightMm / 2;
      const rx = op.widthMm / 2;
      const ry = op.heightMm / 2;
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        return true;
      }
    } else {
      if (
        x >= op.xMm &&
        x <= op.xMm + op.widthMm &&
        y >= op.yMm &&
        y <= op.yMm + op.heightMm
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Clips a tile rectangle [tx, ty, tw, th] to the room and openings.
 * Returns the clipped shapes and classification.
 */
export function calculateTileCoverage(
  tx: number,
  ty: number,
  tw: number,
  th: number,
  room: RoomSpec,
  openings: Opening[],
  row: number,
  col: number,
  id: string,
  rotation: number = 0
): CalculatedTile {
  // Test points inside the tile (a 5x5 grid) to find accurate coverage and cuts
  let insideCount = 0;
  let openingCount = 0;
  const steps = 5;
  
  const cx = tx + tw / 2;
  const cy = ty + th / 2;
  const theta = rotation * Math.PI / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      // Sample coordinates inside the tile
      const px = tx + (tw * (i + 0.5)) / steps;
      const py = ty + (th * (j + 0.5)) / steps;

      let testX = px;
      let testY = py;
      
      if (rotation !== 0) {
        const dx = px - cx;
        const dy = py - cy;
        testX = cx + dx * cos - dy * sin;
        testY = cy + dx * sin + dy * cos;
      }

      const inRoom = isPointInRoom(testX, testY, room);
      if (inRoom) {
        if (isPointInOpenings(testX, testY, openings)) {
          openingCount++;
        } else {
          insideCount++;
        }
      }
    }
  }

  const totalPoints = steps * steps;
  const isInside = insideCount > 0;
  
  // If no parts of the tile are in the room, or if the entire tile is covered by openings
  if (!isInside) {
    return {
      id,
      row,
      col,
      x: tx,
      y: ty,
      w: tw,
      h: th,
      isInside: false,
      isPartial: false,
      isOpeningCut: false,
      areaFraction: 0,
      cutWidthMm: 0,
      cutHeightMm: 0,
      reusable: false,
    };
  }

  const areaFraction = insideCount / totalPoints;
  const isPartial = insideCount < totalPoints;
  const isOpeningCut = openingCount > 0;

  // Estimate the cut dimensions by checking intersections
  // We clamp the tile rectangle to the room box to show realistic cut dims
  let cutWidthMm = tw;
  let cutHeightMm = th;

  if (isPartial) {
    // Left/Right clamps
    const leftClamp = Math.max(tx, 0);
    const rightClamp = Math.min(tx + tw, room.widthMm);
    cutWidthMm = Math.max(0, rightClamp - leftClamp);

    // Top/Bottom clamps
    const topClamp = Math.max(ty, 0);
    const bottomClamp = Math.min(ty + th, room.heightMm);
    cutHeightMm = Math.max(0, bottomClamp - topClamp);

    // If L-shape cutout intersects
    if (room.shape === "L-Shape") {
      const cutoutX = room.widthMm - room.indentWidthMm;
      const cutoutY = room.heightMm - room.indentHeightMm;
      
      // If the tile falls in the cutout area, adjust dimensions
      if (tx + tw > cutoutX && ty + th > cutoutY) {
        // Tile overlaps the cutout. Let's approximate the cut sizes based on which part is inside
        const inMainLeft = tx < cutoutX;
        const inMainTop = ty < cutoutY;
        if (inMainLeft && !inMainTop) {
          cutWidthMm = Math.max(0, cutoutX - tx);
        } else if (!inMainLeft && inMainTop) {
          cutHeightMm = Math.max(0, cutoutY - ty);
        }
      }
    }
  }

  // A partial cut is reusable if it's a straight cut with a significant portion remaining
  // e.g., if we only use less than 40% of the tile, the remaining 60% might be reusable.
  const reusable = isPartial && !isOpeningCut && areaFraction < 0.45;

  return {
    id,
    row,
    col,
    x: tx,
    y: ty,
    w: tw,
    h: th,
    isInside: true,
    isPartial,
    isOpeningCut,
    areaFraction,
    cutWidthMm,
    cutHeightMm,
    reusable,
    rotation,
  };
}

/**
 * Performs full layout calculation
 */
export function performTakeoff(
  room: RoomSpec,
  tile: TileSpec,
  openings: Opening[],
  startingPoint: StartingPoint,
  customOffsetX = 0,
  customOffsetY = 0
): LayoutResult {
  const { widthMm: W, heightMm: H } = room;
  
  const tileW = tile.widthMm;
  const tileH = tile.heightMm;

  const stepW = tileW + tile.groutWidthMm;
  const stepH = tileH + tile.groutWidthMm;

  // Determine starting coordinate offsets relative to room top-left (0,0)
  let startX = 0;
  let startY = 0;

  switch (startingPoint) {
    case "Top-Left":
      startX = 0;
      startY = 0;
      break;
    case "Top-Right":
      startX = (W % stepW) - stepW;
      startY = 0;
      break;
    case "Bottom-Left":
      startX = 0;
      startY = (H % stepH) - stepH;
      break;
    case "Bottom-Right":
      startX = (W % stepW) - stepW;
      startY = (H % stepH) - stepH;
      break;
    case "Center": {
      // Center tile aligned with center of room
      const centerX = W / 2;
      const centerY = H / 2;
      // Position first tile's center at room center
      startX = (centerX - tileW / 2) % stepW - stepW;
      startY = (centerY - tileH / 2) % stepH - stepH;
      break;
    }
    case "Custom":
      startX = customOffsetX;
      startY = customOffsetY;
      break;
  }

  // Cover the entire room (including some margin outside to catch edge cuts)
  const colsNeeded = Math.ceil(W / stepW) + 4;
  const rowsNeeded = Math.ceil(H / stepH) + 4;

  const minCol = -2;
  const maxCol = colsNeeded;
  const minRow = -2;
  const maxRow = rowsNeeded;

  const calculatedTiles: CalculatedTile[] = [];

  if (tile.pattern === "Radial Cobblestone") {
    // Generate concentric rings starting from center
    const maxDist = Math.sqrt(W * W + H * H);
    // Determine the center offset. startX, startY represent the logical origin.
    // For "Center", startX/Y was offset to the top-left of the center tile.
    // Let's get the absolute center point based on startingPoint choice.
    let originX = startX;
    let originY = startY;
    
    // Look for a floor trap opening to center around
    const floorTrap = openings.find(op => op.type === "Floor Trap");
    
    if (floorTrap) {
      originX = floorTrap.xMm + floorTrap.widthMm / 2;
      originY = floorTrap.yMm + floorTrap.heightMm / 2;
    } else if (startingPoint === "Center") {
      originX = W / 2;
      originY = H / 2;
    } else {
      // For other anchors, just use startX/startY as the center of the radial pattern
      originX = startX;
      originY = startY;
    }

    const numRings = Math.ceil(maxDist / stepH);
    let tileIdCounter = 0;
    
    // Core tile at center
    const cx = originX - tileW / 2;
    const cy = originY - tileH / 2;
    const coreId = `tile-radial-0`;
    const coreData = calculateTileCoverage(cx, cy, tileW, tileH, room, openings, 0, 0, coreId, 0);
    if (coreData.isInside) calculatedTiles.push(coreData);
    tileIdCounter++;

    for (let r = 1; r <= numRings; r++) {
      const radius = r * stepH;
      const circumference = 2 * Math.PI * radius;
      // Stagger spacing by adding extra grout allowance or spacing
      const numTilesInRing = Math.max(1, Math.floor(circumference / stepW));
      const angleStep = (2 * Math.PI) / numTilesInRing;
      
      // Add a slight stagger offset per ring to look like cobblestone
      const ringOffset = (r % 2 === 0) ? (angleStep / 2) : 0;

      for (let i = 0; i < numTilesInRing; i++) {
        const theta = i * angleStep + ringOffset;
        // Center of the tile
        const tCenterX = originX + radius * Math.cos(theta);
        const tCenterY = originY + radius * Math.sin(theta);
        
        // Top-left of the tile for layout drawing
        const tx = tCenterX - tileW / 2;
        const ty = tCenterY - tileH / 2;
        
        const rotationDeg = (theta * 180) / Math.PI + 90; // Rotate so top faces outward
        
        const id = `tile-radial-${tileIdCounter++}`;
        const tileData = calculateTileCoverage(tx, ty, tileW, tileH, room, openings, r, i, id, rotationDeg);
        
        if (tileData.isInside) {
          calculatedTiles.push(tileData);
        }
      }
    }
  } else {
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        // Tile top-left coordinates before shifts
        let tx = startX + c * stepW;
        let ty = startY + r * stepH;

        // Pattern shifts
        if (tile.pattern === "Brick Bond" && Math.abs(r) % 2 === 1) {
          // Shift alternating rows by 50%
          tx += stepW / 2;
        } else if (tile.pattern === "Quarter Bond") {
          tx += (Math.abs(r) % 4) * (stepW * 0.25);
        } else if (tile.pattern === "One-Third Bond") {
          tx += (Math.abs(r) % 3) * (stepW / 3);
        }

        // Diagonal patterns (rotates layout by 45 deg)
        // To simulate diagonal pattern simply for calculation & visual display:
        // We can skew/offset columns of each row, or we can transform coordinates.
        // Let's implement dynamic stagger for diagonal approximation,
        // or compute actual intersections.
        if (tile.pattern === "Diagonal") {
          tx += (r % 2) * (stepW / 2);
        }

        const id = `tile-${r}-${c}`;
        const tileData = calculateTileCoverage(tx, ty, tileW, tileH, room, openings, r, c, id, 0);

        if (tileData.isInside) {
          calculatedTiles.push(tileData);
        }
      }
    }
  }

  // Aggregate results
  let fullTilesCount = 0;
  let partialTilesCount = 0;
  let reusableOffcutsCount = 0;
  
  // Edge cut counters
  let topCuts = 0;
  let bottomCuts = 0;
  let leftCuts = 0;
  let rightCuts = 0;
  let cornerCuts = 0;

  let largestArea = 0;
  let smallestArea = Infinity;
  let largestCutDim = { w: 0, h: 0 };
  let smallestCutDim = { w: tileW, h: tileH };

  // Area Calculations
  // Area of one tile
  const tileAreaM2 = (tileW * tileH) / 1000000;

  calculatedTiles.forEach((t) => {
    if (t.isPartial) {
      partialTilesCount++;
      if (t.reusable) {
        reusableOffcutsCount++;
      }

      // Detect which edge the cut belongs to
      const overlapsLeft = t.x < 0;
      const overlapsRight = t.x + t.w > W;
      const overlapsTop = t.y < 0;
      const overlapsBottom = t.y + t.h > H;

      if (overlapsTop) topCuts++;
      if (overlapsBottom) bottomCuts++;
      if (overlapsLeft) leftCuts++;
      if (overlapsRight) rightCuts++;

      if ((overlapsLeft || overlapsRight) && (overlapsTop || overlapsBottom)) {
        cornerCuts++;
      }

      // Compute cut area to track largest/smallest cuts
      const cutArea = t.cutWidthMm * t.cutHeightMm;
      if (cutArea > 0) {
        if (cutArea > largestArea) {
          largestArea = cutArea;
          largestCutDim = { w: t.cutWidthMm, h: t.cutHeightMm };
        }
        if (cutArea < smallestArea) {
          smallestArea = cutArea;
          smallestCutDim = { w: t.cutWidthMm, h: t.cutHeightMm };
        }
      }
    } else {
      fullTilesCount++;
    }
  });

  if (smallestArea === Infinity) {
    smallestArea = 0;
    smallestCutDim = { w: 0, h: 0 };
  }

  // Calculate Net Room Area
  // Rectangular area
  let grossAreaM2 = (W * H) / 1000000;
  let netAreaM2 = grossAreaM2;

  if (room.shape === "L-Shape") {
    const cutoutM2 = (room.indentWidthMm * room.indentHeightMm) / 1000000;
    netAreaM2 -= cutoutM2;
    grossAreaM2 -= cutoutM2;
  } else if (room.shape === "U-Shape") {
    const cutoutM2 = (room.indentWidthMm * room.indentHeightMm) / 1000000;
    netAreaM2 -= cutoutM2;
    grossAreaM2 -= cutoutM2;
  } else if (room.shape === "Triangle") {
    netAreaM2 = grossAreaM2 / 2;
    grossAreaM2 = netAreaM2;
  } else if (room.shape === "Circular") {
    netAreaM2 = Math.PI * (W / 2) * (H / 2) / 1000000;
    grossAreaM2 = netAreaM2;
  } else if (room.shape === "Octagon") {
    const c = Math.min(W, H) / 3.414;
    const cornerAreaM2 = (c * c / 2) / 1000000;
    netAreaM2 -= (cornerAreaM2 * 4);
    grossAreaM2 -= (cornerAreaM2 * 4);
  }

  // Deduct openings
  let openingsAreaM2 = 0;
  openings.forEach((op) => {
    openingsAreaM2 += (op.widthMm * op.heightMm) / 1000000;
  });

  netAreaM2 = Math.max(0, netAreaM2 - openingsAreaM2);

  // Reusable offcut optimization:
  // Pair up small cuts to see if they can be cut from the same tile.
  // For instance, if two cuts are small enough (sum of fractions <= 0.85),
  // they can share a single tile.
  let pairedCutsReduction = 0;
  const partialsSorted = calculatedTiles
    .filter((t) => t.isPartial && !t.isOpeningCut)
    .sort((a, b) => b.areaFraction - a.areaFraction); // largest fraction to smallest

  let i = 0;
  let j = partialsSorted.length - 1;

  while (i < j) {
    const largeCut = partialsSorted[i];
    const smallCut = partialsSorted[j];

    // If they can fit on the same tile (with a safety margin)
    if (largeCut.areaFraction + smallCut.areaFraction <= 0.85) {
      pairedCutsReduction++;
      j--; // Pair matched! Move left pointer of small cuts
    }
    i++; // Move right pointer of large cuts
  }

  // Net tiles required = Full tiles + (Partial tiles - Paired reductions)
  const totalTilesRequired = fullTilesCount + partialTilesCount - pairedCutsReduction;

  return {
    fullTiles: fullTilesCount,
    partialTiles: partialTilesCount,
    totalTilesRequired,
    reusableOffcuts: reusableOffcutsCount,
    netAreaM2: Number(netAreaM2.toFixed(3)),
    grossAreaM2: Number(grossAreaM2.toFixed(3)),
    tiles: calculatedTiles,
    numRows: rowsNeeded - 4,
    numCols: colsNeeded - 4,
    edgeCuts: {
      top: topCuts,
      bottom: bottomCuts,
      left: leftCuts,
      right: rightCuts,
    },
    cornerCuts,
    largestCutMm2: largestArea,
    smallestCutMm2: smallestArea,
    largestCutDim,
    smallestCutDim,
  };
}
