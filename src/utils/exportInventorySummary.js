const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const buildCell = (value, type = "String") =>
  `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;

const buildRow = (values) => `<Row>${values.join("")}</Row>`;

const headerCell = (text) =>
  `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(text)}</Data></Cell>`;

const getFormattedDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatFirestoreDate = (move) => {
  const d = move.exitDate || move.entryDate || move.movementDate;
  if (d) return d;
  if (move.createdAt?.toDate) return move.createdAt.toDate().toISOString().slice(0, 10);
  return "";
};

const STYLES = `
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="HeaderGreen">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1D6A36" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="HeaderRed">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#7B1E1E" ss:Pattern="Solid"/>
    </Style>
  </Styles>`;

const buildWorkbook = (sheets) => {
  const sheetsXml = sheets.map(({ name, headers, rows, headerStyle = "Header" }) => `
  <Worksheet ss:Name="${escapeXml(name)}">
    <Table>
      <Row>${headers.map((h) => `<Cell ss:StyleID="${headerStyle}"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>
      ${rows}
    </Table>
  </Worksheet>`).join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  ${STYLES}
  ${sheetsXml}
</Workbook>`;
};

const downloadXml = (filename, xml) => {
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Construye mapa { email_lower -> alias, displayName_lower -> alias }
function buildAliasMap(users = []) {
  const map = {};
  users.forEach((u) => {
    if (!u.alias) return;
    if (u.email)       map[u.email.toLowerCase()]       = u.alias;
    if (u.displayName) map[u.displayName.toLowerCase()] = u.alias;
  });
  return map;
}

const ENTRIES_HEADERS = ["Fecha de ingreso", "Codigo", "Nombre", "Unidad", "Cantidad"];
const EXITS_HEADERS   = ["Fecha de salida", "Codigo", "Nombre", "Unidad", "Cantidad", "Entregado a", "Alias", "Estado"];

function buildEntriesRows(moves) {
  return moves
    .filter((m) => m.type === "in")
    .sort((a, b) => formatFirestoreDate(a).localeCompare(formatFirestoreDate(b)))
    .map((m) =>
      buildRow([
        buildCell(formatFirestoreDate(m)),
        buildCell(m.sku || ""),
        buildCell(m.description || ""),
        buildCell(m.unit || ""),
        buildCell(Number(m.quantity || 0), "Number"),
      ])
    )
    .join("");
}

function buildExitsRows(moves, aliasMap = {}) {
  return moves
    .filter((m) => m.type === "out")
    .sort((a, b) => formatFirestoreDate(a).localeCompare(formatFirestoreDate(b)))
    .map((m) => {
      const recipient = m.recipientUser || "";
      const alias = aliasMap[recipient.toLowerCase()] || "";
      return buildRow([
        buildCell(formatFirestoreDate(m)),
        buildCell(m.sku || ""),
        buildCell(m.description || ""),
        buildCell(m.unit || ""),
        buildCell(Number(m.quantity || 0), "Number"),
        buildCell(recipient),
        buildCell(alias),
        buildCell(m.deliveryStatus || "entregado"),
      ]);
    })
    .join("");
}

// exportType: "entries" | "exits" | "all"
// users: array from useUsers() — opcional, para resolver alias
export default function exportInventorySummary(moves, exportType = "all", users = []) {
  const date = getFormattedDate();
  const aliasMap = buildAliasMap(users);
  const sorted = [...moves];

  if (exportType === "entries") {
    const xml = buildWorkbook([{
      name: "Entradas",
      headers: ENTRIES_HEADERS,
      rows: buildEntriesRows(sorted),
      headerStyle: "HeaderGreen",
    }]);
    downloadXml(`entradas-inventario-${date}.xls`, xml);
    return;
  }

  if (exportType === "exits") {
    const xml = buildWorkbook([{
      name: "Salidas",
      headers: EXITS_HEADERS,
      rows: buildExitsRows(sorted, aliasMap),
      headerStyle: "HeaderRed",
    }]);
    downloadXml(`salidas-inventario-${date}.xls`, xml);
    return;
  }

  // "all" — un único archivo con dos hojas
  const xml = buildWorkbook([
    {
      name: "Entradas",
      headers: ENTRIES_HEADERS,
      rows: buildEntriesRows(sorted),
      headerStyle: "HeaderGreen",
    },
    {
      name: "Salidas",
      headers: EXITS_HEADERS,
      rows: buildExitsRows(sorted, aliasMap),
      headerStyle: "HeaderRed",
    },
  ]);
  downloadXml(`movimientos-inventario-${date}.xls`, xml);
}
