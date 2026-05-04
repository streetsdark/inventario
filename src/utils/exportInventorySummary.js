const escapeXml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const buildCell = (value, type = "String") => {
  return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
};

const buildRow = (values) => {
  return `<Row>${values.join("")}</Row>`;
};

const getFormattedDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatFirestoreDate = (move) => {
  const explicitDate = move.exitDate || move.entryDate || move.movementDate;
  if (explicitDate) return explicitDate;

  if (move.createdAt?.toDate) {
    return move.createdAt.toDate().toISOString().slice(0, 10);
  }

  return "";
};

const createWorkbookXml = (sheetName, headers, rows) => {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>
      <Row>
        ${headers
          .map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
          .join("")}
      </Row>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`;
};

const downloadXmlExcel = (filename, xml) => {
  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function exportInventorySummary(moves, exportType = "all") {
  const formattedDate = getFormattedDate();

  const sortedMoves = [...moves].sort((a, b) => {
    const dateA = formatFirestoreDate(a);
    const dateB = formatFirestoreDate(b);

    return dateA.localeCompare(dateB);
  });

  const entriesRows = sortedMoves
    .filter((move) => move.type === "in")
    .map((move) =>
      buildRow([
        buildCell(formatFirestoreDate(move)),
        buildCell(move.sku || ""),
        buildCell(move.description || ""),
        buildCell(move.unit || ""),
        buildCell(Number(move.quantity || 0), "Number"),
      ]),
    )
    .join("");

  const exitsRows = sortedMoves
    .filter((move) => move.type === "out")
    .map((move) =>
      buildRow([
        buildCell(formatFirestoreDate(move)),
        buildCell(move.sku || ""),
        buildCell(move.description || ""),
        buildCell(move.unit || ""),
        buildCell(Number(move.quantity || 0), "Number"),
        buildCell(move.recipientUser || ""),
        buildCell(move.deliveryStatus || "entregado"),
      ]),
    )
    .join("");

  if (exportType === "entries" || exportType === "all") {
    const entriesXml = createWorkbookXml(
      "Ingresos",
      ["Fecha de ingreso", "Codigo", "Nombre", "Unidad", "Cantidad"],
      entriesRows,
    );

    downloadXmlExcel(`ingresos-inventario-${formattedDate}.xls`, entriesXml);
  }

  if (exportType === "exits" || exportType === "all") {
    const exitsXml = createWorkbookXml(
      "Salidas",
      ["Fecha de salida", "Codigo", "Nombre", "Unidad", "Cantidad", "Quien se lo lleva", "Estado"],
      exitsRows,
    );

    downloadXmlExcel(`salidas-inventario-${formattedDate}.xls`, exitsXml);
  }
}
