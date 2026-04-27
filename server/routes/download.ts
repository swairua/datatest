import { RequestHandler } from "express";
import { z } from "zod";
import { getExtractedData } from "../utils/data-store";

const downloadRequestSchema = z.object({
  fileName: z.string(),
  tables: z.array(z.string()),
  format: z.enum(["csv", "json"]),
  sessionId: z.string().optional(),
});

interface MockTableData {
  [key: string]: { [key: string]: string | number }[];
}

// Mock data for demonstration - in production this would come from the actual database
// This represents student data that would be extracted from the SHULEPROBACKUP file
const mockTableData: MockTableData = {
  STUDENTS: [
    { ID: 1, NAME: "Alice Kipchoge", ADMISSION_NO: "STU-001", EMAIL: "alice@school.edu", PHONE: "254712345671", CLASS: "Form 4A", STATUS: "Active" },
    { ID: 2, NAME: "Bernard Kimani", ADMISSION_NO: "STU-002", EMAIL: "bernard@school.edu", PHONE: "254712345672", CLASS: "Form 4A", STATUS: "Active" },
    { ID: 3, NAME: "Catherine Mwangi", ADMISSION_NO: "STU-003", EMAIL: "catherine@school.edu", PHONE: "254712345673", CLASS: "Form 3B", STATUS: "Active" },
    { ID: 4, NAME: "David Omondi", ADMISSION_NO: "STU-004", EMAIL: "david@school.edu", PHONE: "254712345674", CLASS: "Form 3B", STATUS: "Active" },
    { ID: 5, NAME: "Eve Kariuki", ADMISSION_NO: "STU-005", EMAIL: "eve@school.edu", PHONE: "254712345675", CLASS: "Form 2C", STATUS: "Active" },
  ],
  CLASSES: [
    { ID: 1, CLASS_NAME: "Form 4A", FORM: "4", STREAM: "A", CLASS_TEACHER: "Mr. Kiplagat", CAPACITY: 40, CURRENT_ENROLLMENT: 38 },
    { ID: 2, CLASS_NAME: "Form 3B", FORM: "3", STREAM: "B", CLASS_TEACHER: "Ms. Njoroge", CAPACITY: 35, CURRENT_ENROLLMENT: 33 },
    { ID: 3, CLASS_NAME: "Form 2C", FORM: "2", STREAM: "C", CLASS_TEACHER: "Mr. Mwangi", CAPACITY: 40, CURRENT_ENROLLMENT: 39 },
  ],
  GRADES: [
    { ID: 1, STUDENT_ID: 1, SUBJECT: "Mathematics", TERM: "1", YEAR: "2025", GRADE: "A", MARKS: "92", COMMENTS: "Excellent performance" },
    { ID: 2, STUDENT_ID: 1, SUBJECT: "English", TERM: "1", YEAR: "2025", GRADE: "B+", MARKS: "85", COMMENTS: "Good" },
    { ID: 3, STUDENT_ID: 2, SUBJECT: "Mathematics", TERM: "1", YEAR: "2025", GRADE: "B", MARKS: "78", COMMENTS: "Needs improvement" },
    { ID: 4, STUDENT_ID: 2, SUBJECT: "Science", TERM: "1", YEAR: "2025", GRADE: "A-", MARKS: "88", COMMENTS: "Very good" },
  ],
  ATTENDANCE: [
    { ID: 1, STUDENT_ID: 1, DATE: "2026-02-01", STATUS: "Present", REMARKS: "On time" },
    { ID: 2, STUDENT_ID: 1, DATE: "2026-02-02", STATUS: "Present", REMARKS: "On time" },
    { ID: 3, STUDENT_ID: 2, DATE: "2026-02-01", STATUS: "Absent", REMARKS: "Sick leave" },
    { ID: 4, STUDENT_ID: 3, DATE: "2026-02-02", STATUS: "Present", REMARKS: "On time" },
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
