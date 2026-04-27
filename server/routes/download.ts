import { RequestHandler } from "express";
import { z } from "zod";
import { getExtractedData, deleteExtractedData } from "../utils/data-store";

const downloadRequestSchema = z.object({
  fileName: z.string(),
  tables: z.array(z.string()),
  format: z.enum(["csv", "json"]),
  sessionId: z.string(),
});

function generateCSV(
  tables: string[],
  tableData: { [tableName: string]: Record<string, any>[] }
): string {
  const csvLines: string[] = [];

  tables.forEach((tableName) => {
    const data = tableData[tableName] || [];

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

function generateJSON(
  tables: string[],
  tableData: { [tableName: string]: Record<string, any>[] }
): string {
  const result: { [key: string]: object[] } = {};

  tables.forEach((tableName) => {
    result[tableName] = tableData[tableName] || [];
  });

  return JSON.stringify(result, null, 2);
}

export const handleDownload: RequestHandler = async (req, res) => {
  try {
    const { tables, format, sessionId } = downloadRequestSchema.parse(req.body);

    if (tables.length === 0) {
      return res.status(400).json({
        error: "No tables selected for export",
      });
    }

    // Retrieve the actual extracted data from the store
    const extractedData = getExtractedData(sessionId);

    if (!extractedData) {
      return res.status(400).json({
        error: "Session expired or invalid. Please extract the database again.",
      });
    }

    let content: string;
    let contentType: string;

    if (format === "csv") {
      content = generateCSV(tables, extractedData.tables);
      contentType = "text/csv";
    } else {
      content = generateJSON(tables, extractedData.tables);
      contentType = "application/json";
    }

    // Clean up the session data after download
    deleteExtractedData(sessionId);

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
