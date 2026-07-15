import React, { useRef } from "react";
import { Project, LayoutResult } from "../types";
import { Printer, Copy, Check, FileSpreadsheet, Plus, Trash2, FileDown, BarChart2 } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface TakeoffReportProps {
  project: Project;
  layoutResult: LayoutResult;
  assumptions: string[];
  setAssumptions: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function TakeoffReport({
  project,
  layoutResult,
  assumptions,
  setAssumptions,
}: TakeoffReportProps) {
  const [copied, setCopied] = React.useState(false);
  const [newAssumption, setNewAssumption] = React.useState("");

  const printReport = () => {
    window.print();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const margin = 15;
    const contentWidth = pageWidth - margin * 2; // 180

    let y = margin;

    // Helper to draw Footer on each page
    const drawPageFooter = (pdfDoc: any, pHeight: number, pWidth: number) => {
      pdfDoc.setFont("Helvetica", "normal");
      pdfDoc.setFontSize(7);
      pdfDoc.setTextColor(148, 163, 184); // slate-400
      pdfDoc.text(
        "CONFIDENTIAL - QUANTITY SURVEYOR TENDER REPORT - AI TILE TAKEOFF WORKSPACE",
        margin,
        pHeight - 10
      );
      pdfDoc.text(
        `Generated dynamically on ${project.date || new Date().toLocaleDateString()}`,
        pWidth - margin,
        pHeight - 10,
        { align: "right" }
      );
      // Draw a line
      pdfDoc.setDrawColor(226, 232, 240);
      pdfDoc.setLineWidth(0.2);
      pdfDoc.line(margin, pHeight - 13, pWidth - margin, pHeight - 13);
    };

    // Helper: Check if we need a new page
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin - 10) {
        doc.addPage();
        drawPageFooter(doc, pageHeight, pageWidth);
        y = margin + 10;
        return true;
      }
      return false;
    };

    // 1. BRAND HEADER BLOCK
    // Draw Left Accent Block
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(margin, y, 3, 16, "F");

    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("AI TILE QUANTITY TAKEOFF LEDGER", margin + 6, y + 5);

    // Subtitle
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Professional Quantity Surveyor Workstation — Bill of Quantities (BoQ)", margin + 6, y + 10);
    doc.text(`Project Ref: ${project.id ? project.id.substring(0, 8).toUpperCase() : "QS-TEMP"}`, margin + 6, y + 14);

    // Right-aligned status badge
    doc.setFillColor(240, 253, 244); // light green
    doc.setDrawColor(187, 247, 208); // green-200
    doc.setLineWidth(0.3);
    doc.rect(pageWidth - margin - 55, y, 55, 9, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61); // green-700
    doc.text("APPROVED TENDER ESTIMATE", pageWidth - margin - 27.5, y + 6.2, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Traceable to 2D Dimensions", pageWidth - margin, y + 14, { align: "right" });

    y += 24;

    // Draw divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    y += 6;

    // 2. PROJECT INFORMATION BOX (Two Columns)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 38, "FD");

    // Left Column header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("PROJECT & CLIENT DETAILS", margin + 5, y + 6);

    let colY = y + 12;
    const drawRow = (label: string, val: string, startX: number, curY: number) => {
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, startX, curY);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(val, startX + 32, curY);
    };

    drawRow("Drawing Name:", project.drawingName || "Unassigned Blueprint", margin + 5, colY);
    drawRow("Area / Room:", project.name || "Main Floor Area", margin + 5, colY + 5);
    drawRow("Client Name:", project.clientName || "General Tender", margin + 5, colY + 10);
    if (project.isIsometric) {
      drawRow("Projection:", "3D Isometric (Flat 2D)", margin + 5, colY + 15);
    } else {
      drawRow("Date Generated:", project.date || new Date().toLocaleDateString(), margin + 5, colY + 15);
    }

    // Right Column header
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("TILE SPECIFICATIONS", margin + 95, y + 6);

    const drawRowRight = (label: string, val: string, startX: number, curY: number) => {
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, startX, curY);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(val, startX + 34, curY);
    };

    drawRowRight("Tile Type:", `${project.tileSpec.tileType} (${project.tileSpec.material})`, margin + 95, colY);
    drawRowRight("Dimensions:", `${project.tileSpec.widthMm} x ${project.tileSpec.heightMm} x ${project.tileSpec.thicknessMm} mm`, margin + 95, colY + 5);
    drawRowRight("Laying Pattern:", `${project.tileSpec.pattern} (${project.tileSpec.orientation})`, margin + 95, colY + 10);
    drawRowRight("Grout / Joints:", `${project.tileSpec.groutWidthMm} mm joints / ${project.tileSpec.perimeterJointMm || 0} mm perim.`, margin + 95, colY + 15);

    y += 38 + 6;

    // 3. PROCUREMENT KPI BOXES (Side-by-side Cards)
    const cardWidth = 56;
    const cardHeight = 20;
    const cardGap = 6;

    // Card 1: Surface Area
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, cardWidth, cardHeight, "FD");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("SURFACE AREA", margin + 4, y + 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Net: ${layoutResult.netAreaM2} m²`, margin + 4, y + 11);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gross: ${layoutResult.grossAreaM2} m²`, margin + 4, y + 16);

    // Card 2: Net Tiles
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin + cardWidth + cardGap, y, cardWidth, cardHeight, "FD");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("NET TILES REQUIRED", margin + cardWidth + cardGap + 4, y + 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(`${layoutResult.totalTilesRequired} pcs`, margin + cardWidth + cardGap + 4, y + 12);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("(Before wastage buffer)", margin + cardWidth + cardGap + 4, y + 16);

    // Card 3: Total including Wastage (Highlighted)
    doc.setFillColor(238, 242, 255); // Indigo-50
    doc.setDrawColor(199, 210, 254); // Indigo-200
    doc.rect(margin + (cardWidth + cardGap) * 2, y, cardWidth, cardHeight, "FD");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("TOTAL (+ WASTAGE BUFFER)", margin + (cardWidth + cardGap) * 2 + 4, y + 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 27, 75); // Navy Indigo-950
    doc.text(`${totalWithWastage} pcs`, margin + (cardWidth + cardGap) * 2 + 4, y + 12);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(22, 163, 74); // green-600
    doc.text(`Includes +${project.suggestedWastagePercent}% wastage`, margin + (cardWidth + cardGap) * 2 + 4, y + 16);

    y += cardHeight + 8;

    // 4. DETAILED QUANTITY BREAKDOWN
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("DETAILED QUANTITY BREAKDOWN", margin, y);
    y += 2.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // Let's print details in a clean table row structure
    const drawDataRow = (label1: string, val1: string, label2: string, val2: string, curY: number) => {
      // Background row striping
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, curY - 3.5, contentWidth, 5.5, "F");

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label1, margin + 4, curY);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(val1, margin + 45, curY);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label2, margin + 95, curY);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(val2, margin + 145, curY);
    };

    drawDataRow("Full Tiles (uncut):", String(layoutResult.fullTiles), "Total Grid Rows:", String(layoutResult.numRows), y);
    y += 6;
    drawDataRow("Partial Tiles (cuts):", String(layoutResult.partialTiles), "Total Grid Columns:", String(layoutResult.numCols), y);
    y += 6;
    drawDataRow("Reusable Offcuts Salvaged:", String(layoutResult.reusableOffcuts), "Top / Bottom Edge Cuts:", `${layoutResult.edgeCuts.top} / ${layoutResult.edgeCuts.bottom}`, y);
    y += 6;
    drawDataRow("Total Corner Cuts:", String(layoutResult.cornerCuts), "Left / Right Edge Cuts:", `${layoutResult.edgeCuts.left} / ${layoutResult.edgeCuts.right}`, y);
    y += 6;

    // Let's show smallest/largest cuts
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y - 3.5, contentWidth, 5.5, "F");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Smallest Cut Dimension:", margin + 4, y);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(217, 119, 6); // Amber-600
    doc.text(`${Math.round(layoutResult.smallestCutDim.w)} x ${Math.round(layoutResult.smallestCutDim.h)} mm`, margin + 45, y);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Largest Cut Dimension:", margin + 95, y);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`${Math.round(layoutResult.largestCutDim.w)} x ${Math.round(layoutResult.largestCutDim.h)} mm`, margin + 145, y);

    y += 10;

    // 5. INTERNAL OPENINGS & DEDUCTIONS
    if (project.openings && project.openings.length > 0) {
      checkPageBreak(35);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("FLOOR OPENINGS & DEDUCTIONS", margin, y);
      y += 2.5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      // Table Header
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y - 3.5, contentWidth, 5.5, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Type / Identifier", margin + 4, y);
      doc.text("Width (mm)", margin + 45, y);
      doc.text("Height (mm)", margin + 80, y);
      doc.text("Coordinates Offset X, Y (mm)", margin + 115, y);
      doc.text("Area Deducted", margin + 155, y);

      y += 6;

      project.openings.forEach((op, index) => {
        checkPageBreak(10);
        if (index % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y - 3.5, contentWidth, 5.5, "F");
        }
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(`${op.type} #${index + 1}`, margin + 4, y);
        doc.text(String(op.widthMm), margin + 45, y);
        doc.text(String(op.heightMm), margin + 80, y);
        doc.setFont("Helvetica", "oblique");
        doc.text(`X: ${op.xMm}, Y: ${op.yMm}`, margin + 115, y);
        doc.setFont("Helvetica", "bold");
        const opAreaM2 = ((op.widthMm * op.heightMm) / 1000000).toFixed(3);
        doc.text(`-${opAreaM2} m²`, margin + 155, y);
        y += 6;
      });

      y += 4;
    }

    // 6. SURVEYOR ASSUMPTIONS & CONTRACTUAL NOTES
    checkPageBreak(30);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("SURVEYOR ASSUMPTIONS & CONTRACTUAL NOTES", margin, y);
    y += 2.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    const finalAssumptions = [...assumptions];
    if (project.isIsometric && project.isometricNotes) {
      finalAssumptions.unshift(`[3D Isometric Projection] ${project.isometricNotes}`);
    }

    if (finalAssumptions && finalAssumptions.length > 0) {
      finalAssumptions.forEach((ass, index) => {
        const wrappedText = doc.splitTextToSize(`${index + 1}. ${ass}`, contentWidth - 8);
        const textHeight = wrappedText.length * 4.2;

        checkPageBreak(textHeight + 2);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        wrappedText.forEach((lineText: string, lineIdx: number) => {
          doc.text(lineText, margin + 4, y + lineIdx * 4.2);
        });

        y += textHeight + 2;
      });
    } else {
      doc.setFont("Helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("No specific assumptions declared. Standard building tolerances and typical wastage multipliers apply.", margin + 4, y);
      y += 6;
    }

    y += 6;

    // 7. SIGN-OFF BLOCK
    checkPageBreak(35);
    y += 4;

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    y += 8;

    // Prepared by box
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("PREPARED BY (QUANTITY SURVEYOR):", margin + 4, y);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("__________________________________________", margin + 4, y + 12);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("AI Quantity Surveyor Engine", margin + 4, y + 17);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Quantity Surveying Workstation", margin + 4, y + 21);

    // Approved by box
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("APPROVED BY (LEAD PROJECT ENGINEER):", margin + 95, y);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("__________________________________________", margin + 95, y + 12);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("Wee Hur Construction Team Representative", margin + 95, y + 17);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Date: ____ / ____ / ________", margin + 95, y + 21);

    // Draw footers on all pages
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawPageFooter(doc, pageHeight, pageWidth);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    // Save PDF
    const safeRoomName = (project.name || "takeoff").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    doc.save(`tile_takeoff_ledger_${safeRoomName}.pdf`);
  };

  const copyMarkdown = () => {
    const markdown = `
# TILE QUANTITY TAKEOFF REPORT

## Project Information
- **Drawing Name:** ${project.drawingName || "Unassigned Blueprint"}
- **Area Name:** ${project.name || "Main Floor Area"}
- **Tile Type:** ${project.tileSpec.tileType}
- **Tile Size:** ${project.tileSpec.widthMm} × ${project.tileSpec.heightMm} mm (Thickness: ${project.tileSpec.thicknessMm} mm)
- **Grout Width:** ${project.tileSpec.groutWidthMm} mm
- **Tile Pattern:** ${project.tileSpec.pattern} (${project.tileSpec.orientation})

## Calculated Area
- **Net Area:** ${layoutResult.netAreaM2} m²
- **Gross Area:** ${layoutResult.grossAreaM2} m²

## Tile Count
- **Full Tiles:** ${layoutResult.fullTiles}
- **Partial Tiles (Cuts):** ${layoutResult.partialTiles}
- **Total Tiles Required (Net):** ${layoutResult.totalTilesRequired}

## Wastage Buffer
- **Suggested Wastage:** ${project.suggestedWastagePercent}%
- **Total Tiles Including Wastage:** ${Math.ceil(layoutResult.totalTilesRequired * (1 + project.suggestedWastagePercent / 100))} pcs

## Tile Layout Summary
- **Number of Rows:** ${layoutResult.numRows}
- **Number of Columns:** ${layoutResult.numCols}
- **Cut Tiles Along Each Edge:**
  - Top: ${layoutResult.edgeCuts.top}
  - Bottom: ${layoutResult.edgeCuts.bottom}
  - Left: ${layoutResult.edgeCuts.left}
  - Right: ${layoutResult.edgeCuts.right}
- **Corner Cuts:** ${layoutResult.cornerCuts}
- **Largest Cut:** ${layoutResult.largestCutDim.w} × ${layoutResult.largestCutDim.h} mm
- **Smallest Cut:** ${layoutResult.smallestCutDim.w} × ${layoutResult.smallestCutDim.h} mm

## Assumptions
${(project.isIsometric && project.isometricNotes ? [`[3D Isometric Projection] ${project.isometricNotes}`, ...assumptions] : assumptions).map((ass, i) => `${i + 1}. ${ass}`).join("\n")}
`;

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddAssumption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssumption.trim()) return;
    setAssumptions([...assumptions, newAssumption.trim()]);
    setNewAssumption("");
  };

  const handleRemoveAssumption = (idx: number) => {
    setAssumptions(assumptions.filter((_, i) => i !== idx));
  };

  // Compute final counts
  const totalWithWastage = Math.ceil(layoutResult.totalTilesRequired * (1 + project.suggestedWastagePercent / 100));

  const chartData = [
    {
      name: "Net Tiles",
      quantity: layoutResult.totalTilesRequired,
      fill: "#6366f1", // Indigo 500
    },
    {
      name: "With Wastage",
      quantity: totalWithWastage,
      fill: "#10b981", // Emerald 500
    },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-800 overflow-y-auto p-6 md:p-8" id="takeoff-report-view">
      {/* Report Controls (Hidden during printing) */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Quantity Takeoff Ledger</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Verify calculated lists, print reports, or copy markdown lists for estimates.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" /> Copied Markdown
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Copy Report
              </>
            )}
          </button>

          <button
            onClick={exportToPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
            title="Download PDF Tender Estimate"
          >
            <FileDown className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export to PDF
          </button>
          
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all"
          >
            <Printer className="w-4 h-4" /> Print Takeoff Sheet
          </button>
        </div>
      </div>

      {/* TENDER TAKE-OFF SHEET FORM CONTAINER */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-8 print:border-none print:shadow-none print:p-0">
        
        {/* Printable Header logo */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-6 mb-8">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold font-mono">Quantity Takeoff Workspace</span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">AI TILE TAKEOFF LEDGER</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Generated dynamically on {project.date}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold font-mono">
              APPROVED TENDER ESTIMATE
            </span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Status: Traceable to 2D Dimensions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Section 1: Project Info */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3 font-mono">Project Information</h3>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Drawing Name</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">{project.drawingName || "Unassigned Blueprint"}</td>
                </tr>
                {project.isIsometric && (
                  <>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-indigo-50/20">
                      <td className="py-2.5 font-semibold text-indigo-700 dark:text-indigo-300">Projection Type</td>
                      <td className="py-2.5 font-black text-indigo-800 text-right">3D Isometric (Flat 2D Projection)</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-indigo-50/20">
                      <td className="py-2.5 font-medium text-indigo-700 dark:text-indigo-300" colSpan={2}>
                        <div className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400 text-left mt-0.5 leading-relaxed">
                          <strong>AI Projection Notes:</strong> {project.isometricNotes}
                        </div>
                      </td>
                    </tr>
                  </>
                )}
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Area Name / Room</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">{project.name || "Main Floor Area"}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Tile Type / Material</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {project.tileSpec.tileType} ({project.tileSpec.material})
                  </td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Tile Dimensions</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {project.tileSpec.widthMm} × {project.tileSpec.heightMm} mm (t: {project.tileSpec.thicknessMm} mm)
                  </td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Laying Pattern / Grout</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {project.tileSpec.pattern} / {project.tileSpec.groutWidthMm} mm joints
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Areas & Wastage */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3 font-mono">Calculated Area & procurement</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl mb-4">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block font-mono">Net Area</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-200">{layoutResult.netAreaM2} m²</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block font-mono">Gross Area</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-200">{layoutResult.grossAreaM2} m²</span>
              </div>
            </div>

            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Suggested Wastage</td>
                  <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200 text-right">{project.suggestedWastagePercent}%</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Total Tiles (Net)</td>
                  <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200 text-right">{layoutResult.totalTilesRequired} pcs</td>
                </tr>
                <tr className="bg-indigo-50/50">
                  <td className="p-3 font-bold text-indigo-900">Total Including Wastage</td>
                  <td className="p-3 font-black text-indigo-900 text-base text-right">{totalWithWastage} pcs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Detailed Tile Count */}
        <div className="mb-8" id="detailed-breakdown-section">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3 font-mono">Detailed Quantity Breakdown</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block font-mono">Full Tiles</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{layoutResult.fullTiles}</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">No cuts required</p>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block font-mono">Partial Tiles</span>
              <span className="text-2xl font-black text-amber-500">{layoutResult.partialTiles}</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Edge / Corner cuts</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block font-mono">Reusable Offcuts</span>
              <span className="text-2xl font-black text-emerald-600">{layoutResult.reusableOffcuts}</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Salvagable segments</p>
            </div>
          </div>
        </div>

        {/* Section 3.5: Recharts Material Comparison Bar Chart */}
        <div className="mb-8 print:hidden" id="material-comparison-chart-section">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold font-mono">Material Requirement Comparison</h3>
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Bar Chart Representation */}
              <div className="md:col-span-2 h-[220px]" id="material-recharts-bar-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#475569', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg text-xs font-sans">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{data.name}</p>
                              <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">{data.quantity} pcs</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="quantity" radius={[4, 4, 0, 0]} maxBarSize={55}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Insights and Legend details */}
              <div className="flex flex-col gap-4 text-xs font-sans">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm" id="net-tiles-summary-card">
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase block font-mono">Net Tile Count</span>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-200">{layoutResult.totalTilesRequired} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">pcs</span></span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    The minimum number of exact pieces to tile the surface area with current layout parameters.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm" id="wastage-tiles-summary-card">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase block font-mono">Tender Order Count (+{project.suggestedWastagePercent}%)</span>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-200">{totalWithWastage} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">pcs</span></span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Includes a safety buffer of <strong>+{totalWithWastage - layoutResult.totalTilesRequired} pcs</strong> to protect against breakage and custom cutting waste.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Tile Layout Summary */}
        <div className="mb-8">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3 font-mono">Layout Grid Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Number of Rows</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">{layoutResult.numRows}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Number of Columns</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">{layoutResult.numCols}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Total Corner cuts</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">{layoutResult.cornerCuts}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Edge Cuts (Top / Bottom)</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {layoutResult.edgeCuts.top} / {layoutResult.edgeCuts.bottom}
                  </td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Edge Cuts (Left / Right)</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {layoutResult.edgeCuts.left} / {layoutResult.edgeCuts.right}
                  </td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400">Largest / Smallest Cut sizes</td>
                  <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 text-right text-[10px] font-mono">
                    {layoutResult.largestCutDim.w}×{layoutResult.largestCutDim.h} / {layoutResult.smallestCutDim.w}×{layoutResult.smallestCutDim.h} mm
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Assumptions ledger (Fully editable during tender preparation) */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold font-mono">Surveyor Assumptions & Notes</h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 print:hidden">Editable list</span>
          </div>

          {assumptions.length > 0 ? (
            <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-4">
              {assumptions.map((ass, i) => (
                <li key={i} className="group hover:text-slate-950 transition-colors">
                  <span className="inline-block max-w-[90%] whitespace-pre-wrap">{ass}</span>
                  <button
                    onClick={() => handleRemoveAssumption(i)}
                    className="ml-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-[10px]"
                    title="Remove assumption"
                  >
                    (Remove)
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-4">No custom assumptions declared yet. Add typical contract limits or site factors below.</p>
          )}

          {/* Add custom assumption form */}
          <form onSubmit={handleAddAssumption} className="flex gap-2 print:hidden">
            <input
              type="text"
              value={newAssumption}
              onChange={(e) => setNewAssumption(e.target.value)}
              placeholder="e.g. Tile layout centered strictly. Floor trap coordinates assumed exact."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Note
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
