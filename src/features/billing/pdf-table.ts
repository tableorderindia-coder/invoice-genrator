type PdfTableOptions = {
  x: number;
  y: number;
  widths: number[];
  rows: string[][];
  pageBottom: number;
  headerRows?: number;
  fontSize?: number;
  padding?: number;
  rowGap?: number;
};

function rowHeight(
  doc: PDFKit.PDFDocument,
  row: string[],
  widths: number[],
  fontSize: number,
  padding: number,
) {
  doc.fontSize(fontSize);
  const contentHeight = row.reduce((height, cell, index) => {
    const width = Math.max(12, (widths[index] ?? 60) - padding * 2);
    return Math.max(
      height,
      doc.heightOfString(cell || " ", {
        width,
      }),
    );
  }, 0);

  return Math.max(20, contentHeight + padding * 2);
}

function cellAlign(value: string, index: number) {
  if (index === 0) return "left";
  return /^[+$₹\d(.-]/.test(value.trim()) ? "right" : "left";
}

function drawRow(
  doc: PDFKit.PDFDocument,
  row: string[],
  input: Pick<PdfTableOptions, "x" | "widths" | "padding"> & {
    y: number;
    height: number;
    isHeader: boolean;
    isTotal: boolean;
    fontSize: number;
  },
) {
  const padding = input.padding ?? 4;
  let cellX = input.x;
  doc
    .lineWidth(input.isHeader ? 0.7 : 0.45)
    .strokeColor(input.isHeader ? "#64748b" : "#cbd5e1")
    .fillColor(input.isHeader ? "#f1f5f9" : input.isTotal ? "#f8fafc" : "#ffffff");

  for (const width of input.widths) {
    doc.rect(cellX, input.y, width, input.height).fillAndStroke();
    cellX += width;
  }

  cellX = input.x;
  doc
    .font(input.isHeader || input.isTotal ? "Helvetica-Bold" : "Helvetica")
    .fontSize(input.fontSize)
    .fillColor("#0f172a");

  row.forEach((cell, index) => {
    const width = input.widths[index] ?? 60;
    doc.text(cell, cellX + padding, input.y + padding, {
      width: Math.max(10, width - padding * 2),
      height: input.height - padding * 2,
      align: cellAlign(cell, index),
      ellipsis: true,
    });
    cellX += width;
  });
}

export function drawPdfTable(doc: PDFKit.PDFDocument, options: PdfTableOptions) {
  const headerRows = options.headerRows ?? 1;
  const fontSize = options.fontSize ?? 8;
  const padding = options.padding ?? 4;
  const rowGap = options.rowGap ?? 0;
  const header = options.rows.slice(0, headerRows);
  let y = options.y;

  const drawHeaders = () => {
    for (const row of header) {
      const height = rowHeight(doc, row, options.widths, fontSize, padding);
      drawRow(doc, row, {
        x: options.x,
        y,
        widths: options.widths,
        padding,
        height,
        isHeader: true,
        isTotal: false,
        fontSize,
      });
      y += height + rowGap;
    }
  };

  drawHeaders();

  for (const row of options.rows.slice(headerRows)) {
    const height = rowHeight(doc, row, options.widths, fontSize, padding);
    if (y + height > options.pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaders();
    }

    drawRow(doc, row, {
      x: options.x,
      y,
      widths: options.widths,
      padding,
      height,
      isHeader: false,
      isTotal: row[0] === "Totals" || row[0] === "Total",
      fontSize,
    });
    y += height + rowGap;
  }

  return y;
}

export function splitWidePdfTable(rows: string[][], maxColumns: number) {
  const header = rows[0] ?? [];
  if (header.length <= maxColumns) return [rows];

  const chunks: string[][][] = [];
  for (let start = 1; start < header.length; start += maxColumns - 1) {
    const indexes = [0, ...Array.from(
      { length: Math.min(maxColumns - 1, header.length - start) },
      (_, index) => start + index,
    )];
    chunks.push(rows.map((row) => indexes.map((index) => row[index] ?? "")));
  }

  return chunks;
}
