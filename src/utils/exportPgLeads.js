const columns = [
  ["Business Name", "businessName"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Industry", "industry"],
  ["Priority", "priority"],
  ["Location", "location"],
  ["Source", "source"],
  ["PG Status", "pgLeadStatus"],
  ["PG Remarks", "pgRemarks"],
  ["Assigned At", "assignedAt"],
  ["Created At", "createdAt"],
];

function displayValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function csvCell(value) {
  return `"${displayValue(value).replaceAll('"', '""')}"`;
}

function xmlCell(value) {
  return displayValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function pgLeadsToCsv(leads) {
  const header = columns.map(([label]) => csvCell(label)).join(",");
  const rows = leads.map((lead) =>
    columns.map(([, key]) => csvCell(lead[key])).join(","),
  );
  return [header, ...rows].join("\r\n");
}

/** Excel 2003 SpreadsheetML, downloadable as .xls without a third-party dependency. */
export function pgLeadsToExcelXml(leads) {
  const headerCells = columns
    .map(
      ([label]) =>
        `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlCell(label)}</Data></Cell>`,
    )
    .join("");
  const rows = leads
    .map(
      (lead) =>
        `<Row>${columns
          .map(
            ([, key]) =>
              `<Cell><Data ss:Type="String">${xmlCell(lead[key])}</Data></Cell>`,
          )
          .join("")}</Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="PG Leads">
  <Table>
   <Row>${headerCells}</Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;
}
