import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReportTable } from "@/server/admin/reports";
import { ensurePdfFonts, latinFont } from "@/lib/pdf/fonts";
import { MixedText } from "@/lib/pdf/MixedText";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: latinFont },
  siteName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  title: { fontSize: 12, fontWeight: 700, marginTop: 10 },
  meta: { fontSize: 9, color: "#555555", marginTop: 2 },
  note: { fontSize: 8, color: "#777777", marginTop: 2, marginBottom: 10 },
  table: { marginTop: 8, borderTop: "1px solid #ddd", borderLeft: "1px solid #ddd" },
  row: { flexDirection: "row" },
  headerCell: {
    flex: 1,
    padding: 4,
    borderRight: "1px solid #ddd",
    borderBottom: "1px solid #ddd",
    backgroundColor: "#f3f3f3",
    fontWeight: 700,
  },
  cell: {
    flex: 1,
    padding: 4,
    borderRight: "1px solid #ddd",
    borderBottom: "1px solid #ddd",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    fontSize: 8,
    color: "#999999",
    textAlign: "center",
  },
});

function ReportDocument({ table, siteName }: { table: ReportTable; siteName: string }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.siteName}>{siteName}</Text>
        <Text style={styles.title}>{table.title}</Text>
        <Text style={styles.meta}>{table.rangeLabel}</Text>
        {table.note ? <Text style={styles.note}>{table.note}</Text> : null}
        <View style={styles.table}>
          <View style={styles.row}>
            {table.columns.map((column, index) => (
              <MixedText key={index} value={column} style={styles.headerCell} />
            ))}
          </View>
          {table.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((value, cellIndex) => (
                <MixedText key={cellIndex} value={value} style={styles.cell} />
              ))}
            </View>
          ))}
        </View>
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

export async function renderReportPdf(
  table: ReportTable,
  siteName: string,
): Promise<Buffer> {
  ensurePdfFonts();
  return renderToBuffer(<ReportDocument table={table} siteName={siteName} />);
}
