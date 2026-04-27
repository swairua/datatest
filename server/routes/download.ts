import { RequestHandler } from "express";
import { z } from "zod";

const downloadRequestSchema = z.object({
  fileName: z.string(),
  tables: z.array(z.string()),
  format: z.enum(["csv", "json"]),
});

interface MockTableData {
  [key: string]: { [key: string]: string | number }[];
}

// Mock data for demonstration - in production this would come from the database
const mockTableData: MockTableData = {
  CUSTOMERS: [
    { ID: 1, NAME: "John Doe", EMAIL: "john@example.com", PHONE: "555-0101", CREATED_AT: "2026-01-15" },
    { ID: 2, NAME: "Jane Smith", EMAIL: "jane@example.com", PHONE: "555-0102", CREATED_AT: "2026-01-16" },
    { ID: 3, NAME: "Bob Johnson", EMAIL: "bob@example.com", PHONE: "555-0103", CREATED_AT: "2026-01-17" },
  ],
  ORDERS: [
    { ID: 1, CUSTOMER_ID: 1, ORDER_DATE: "2026-02-01", TOTAL_AMOUNT: 150.00, STATUS: "completed" },
    { ID: 2, CUSTOMER_ID: 2, ORDER_DATE: "2026-02-02", TOTAL_AMOUNT: 250.00, STATUS: "completed" },
    { ID: 3, CUSTOMER_ID: 1, ORDER_DATE: "2026-02-03", TOTAL_AMOUNT: 75.50, STATUS: "pending" },
  ],
  PRODUCTS: [
    { ID: 1, NAME: "Product A", SKU: "SKU-001", PRICE: 49.99, STOCK_QUANTITY: 100 },
    { ID: 2, NAME: "Product B", SKU: "SKU-002", PRICE: 79.99, STOCK_QUANTITY: 50 },
  ],
  INVOICES: [
    { ID: 1, ORDER_ID: 1, INVOICE_DATE: "2026-02-01", AMOUNT: 150.00, PAID: true },
    { ID: 2, ORDER_ID: 2, INVOICE_DATE: "2026-02-02", AMOUNT: 250.00, PAID: false },
  ],
};

function generateCSV(tables: string[]): string {
  const csvLines: string[] = [];

  tables.forEach((tableName) => {
    const data = mockTableData[tableName] || [];
    
    if (data.length === 0) return;

    // Add table name as header
    csvLines.push(`\n# ${tableName}\n`);

    // Add column headers
    const columns = Object.keys(data[0]);
    csvLines.push(columns.map((col) => `"${col}"`).join(","));

    // Add data rows
    data.forEach((row) => {
      const values = columns.map((col) => {
        const value = row[col];
        // Escape quotes and wrap in quotes if value contains comma or quote
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return `"${stringValue}"`;
      });
      csvLines.push(values.join(","));
    });
  });

  return csvLines.join("\n");
}

function generateJSON(tables: string[]): string {
  const result: { [key: string]: object[] } = {};

  tables.forEach((tableName) => {
    result[tableName] = mockTableData[tableName] || [];
  });

  return JSON.stringify(result, null, 2);
}

export const handleDownload: RequestHandler = async (req, res) => {
  try {
    const { tables, format } = downloadRequestSchema.parse(req.body);

    if (tables.length === 0) {
      return res.status(400).json({
        error: "No tables selected for export",
      });
    }

    let content: string;
    let contentType: string;

    if (format === "csv") {
      content = generateCSV(tables);
      contentType = "text/csv";
    } else {
      content = generateJSON(tables);
      contentType = "application/json";
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="export.${format}"`);
    res.send(content);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid request format"
        : "Failed to generate export file";

    res.status(400).json({
      error: message,
    });
  }
};
