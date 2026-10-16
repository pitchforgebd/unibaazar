import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { PrintDocument } from "@/server/admin/orders-admin";
import type { GeneralSettings, InvoiceSettings } from "@/server/settings/store";
import { formatTaka } from "@/lib/utils/currency";
import { ensurePdfFonts, latinFont } from "@/lib/pdf/fonts";
import { MixedText } from "@/lib/pdf/MixedText";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: latinFont },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  businessName: { fontSize: 16, fontWeight: 700 },
  businessLine: { fontSize: 9, color: "#555555", marginTop: 1 },
  invoiceTitle: { fontSize: 14, fontWeight: 700, textAlign: "right" },
  invoiceMeta: { fontSize: 9, color: "#555555", textAlign: "right", marginTop: 1 },
  section: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  label: { fontSize: 8, color: "#999999", textTransform: "uppercase", marginBottom: 2 },
  table: { marginTop: 16, borderTop: "1px solid #ddd", borderLeft: "1px solid #ddd" },
  row: { flexDirection: "row" },
  headerCell: {
    padding: 5,
    borderRight: "1px solid #ddd",
    borderBottom: "1px solid #ddd",
    backgroundColor: "#f3f3f3",
    fontWeight: 700,
    fontSize: 9,
  },
  cell: {
    padding: 5,
    borderRight: "1px solid #ddd",
    borderBottom: "1px solid #ddd",
    fontSize: 9,
  },
  colName: { flex: 3 },
  colSku: { flex: 2 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totals: { marginTop: 10, alignItems: "flex-end" },
  totalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    marginTop: 2,
  },
  totalLabel: { fontSize: 9, color: "#555555" },
  totalValue: { fontSize: 9 },
  grandTotal: { fontSize: 11, fontWeight: 700 },
  footer: { marginTop: 24, fontSize: 8, color: "#777777" },
  signature: { marginTop: 32, fontSize: 9, textAlign: "right" },
});

function InvoicePage({
  doc,
  business,
  invoice,
}: {
  doc: PrintDocument;
  business: GeneralSettings;
  invoice: InvoiceSettings;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.businessName}>{business.name}</Text>
          {business.address ? (
            <MixedText value={business.address} style={styles.businessLine} />
          ) : null}
          {business.phone ? (
            <Text style={styles.businessLine}>{business.phone}</Text>
          ) : null}
          {business.email ? (
            <Text style={styles.businessLine}>{business.email}</Text>
          ) : null}
        </View>
        <View>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          <Text style={styles.invoiceMeta}>{doc.invoiceNumber}</Text>
          <Text style={styles.invoiceMeta}>Order {doc.number}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={{ maxWidth: 260 }}>
          <Text style={styles.label}>Bill to</Text>
          <MixedText value={doc.name} style={{ fontSize: 10, fontWeight: 700 }} />
          <Text style={{ fontSize: 9, marginTop: 1 }}>{doc.phone}</Text>
          {doc.email ? <Text style={{ fontSize: 9 }}>{doc.email}</Text> : null}
          <MixedText value={doc.address} style={{ fontSize: 9, marginTop: 1 }} />
          <Text style={{ fontSize: 9, marginTop: 1 }}>{doc.area}</Text>
        </View>
        <View>
          <Text style={styles.label}>Payment</Text>
          <Text style={{ fontSize: 9 }}>{doc.paymentMethod}</Text>
          <Text style={{ ...styles.label, marginTop: 8 }}>Status</Text>
          <Text style={{ fontSize: 9 }}>{doc.status}</Text>
          {doc.trackingId ? (
            <>
              <Text style={{ ...styles.label, marginTop: 8 }}>Tracking</Text>
              <Text style={{ fontSize: 9 }}>{doc.trackingId}</Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={{ ...styles.headerCell, ...styles.colName }}>Item</Text>
          <Text style={{ ...styles.headerCell, ...styles.colSku }}>SKU</Text>
          <Text style={{ ...styles.headerCell, ...styles.colQty }}>Qty</Text>
          <Text style={{ ...styles.headerCell, ...styles.colPrice }}>Price</Text>
          <Text style={{ ...styles.headerCell, ...styles.colTotal }}>Total</Text>
        </View>
        {doc.items.map((item, index) => (
          <View key={index} style={styles.row}>
            <MixedText value={item.name} style={{ ...styles.cell, ...styles.colName }} />
            <Text style={{ ...styles.cell, ...styles.colSku }}>{item.sku}</Text>
            <Text style={{ ...styles.cell, ...styles.colQty }}>{item.qty}</Text>
            <MixedText
              value={formatTaka(item.unitPrice)}
              style={{ ...styles.cell, ...styles.colPrice }}
            />
            <MixedText
              value={formatTaka(item.lineTotal)}
              style={{ ...styles.cell, ...styles.colTotal }}
            />
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <MixedText value={formatTaka(doc.subtotal)} style={styles.totalValue} />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Discount</Text>
          <MixedText value={formatTaka(doc.discount)} style={styles.totalValue} />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Delivery</Text>
          <MixedText value={formatTaka(doc.deliveryCharge)} style={styles.totalValue} />
        </View>
        <View
          style={{
            ...styles.totalRow,
            borderTop: "1px solid #ddd",
            paddingTop: 3,
            marginTop: 4,
          }}
        >
          <Text style={styles.grandTotal}>Total</Text>
          <MixedText value={formatTaka(doc.total)} style={styles.grandTotal} />
        </View>
        {invoice.vatPercent > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT rate {invoice.vatPercent}%</Text>
          </View>
        ) : null}
      </View>

      {invoice.signature ? (
        <MixedText value={invoice.signature} style={styles.signature} />
      ) : null}
      {invoice.footer ? <MixedText value={invoice.footer} style={styles.footer} /> : null}
    </Page>
  );
}

export async function renderInvoicePdf(
  documents: PrintDocument[],
  business: GeneralSettings,
  invoice: InvoiceSettings,
): Promise<Buffer> {
  ensurePdfFonts();
  return renderToBuffer(
    <Document>
      {documents.map((doc) => (
        <InvoicePage key={doc.id} doc={doc} business={business} invoice={invoice} />
      ))}
    </Document>,
  );
}
