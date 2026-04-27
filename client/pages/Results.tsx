import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, ChevronLeft, Table2, Eye, FileJson, FileText, Loader } from "lucide-react";

interface TableInfo {
  name: string;
  rowCount: number;
  columns: string[];
}

interface LocationState {
  fileName: string;
  tables: TableInfo[];
  sessionId: string;
  extractionMethod?: "gbak" | "firebird-library" | "fallback";
  message?: string;
}

export default function Results() {
  const location = useLocation();
  const state = location.state as LocationState;

  // Fallback to home if no extraction data
  if (!state || !state.sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">No extraction data found</h1>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Upload
          </Link>
        </div>
      </div>
    );
  }

  const result = {
    fileName: state.fileName,
    tables: state.tables,
    status: "completed" as const,
  };

  // Auto-select all tables by default
  const [selectedTables, setSelectedTables] = useState<Set<string>>(
    new Set(result.tables.map((t) => t.name))
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [viewingTable, setViewingTable] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleTableSelection = (tableName: string) => {
    const newSelected = new Set(selectedTables);
    if (newSelected.has(tableName)) {
      newSelected.delete(tableName);
    } else {
      newSelected.add(tableName);
    }
    setSelectedTables(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTables.size === result.tables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(result.tables.map((t) => t.name)));
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const tableNames = Array.from(selectedTables);

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: result.fileName,
          tables: tableNames,
          format: exportFormat,
          sessionId: state.sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download file");
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export_${new Date().toISOString().split("T")[0]}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert(error instanceof Error ? error.message : "Failed to download file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const currentTable = result.tables.find((t) => t.name === viewingTable);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Upload
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Conversion Results</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {result.fileName} • {result.tables.length} tables found
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Preview View */}
        {viewingTable && currentTable && (
          <div className="mb-8 animate-fade-in">
            <button
              onClick={() => setViewingTable(null)}
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Selection
            </button>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary/10 to-transparent">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Table2 className="w-5 h-5 text-primary" />
                  {currentTable.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {currentTable.rowCount.toLocaleString()} rows •{" "}
                  {currentTable.columns.length} columns
                </p>
              </div>

              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-foreground mb-3">Column Structure</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {currentTable.columns.map((col) => (
                    <div
                      key={col}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    >
                      <div className="text-xs font-mono text-primary font-semibold">
                        {col}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 text-center bg-slate-50 dark:bg-slate-900 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>{currentTable.rowCount.toLocaleString()} rows ready for export</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection View */}
        {!viewingTable && (
          <>
            {/* Extraction Summary */}
            <div
              className={`mb-8 p-6 rounded-xl border transition-all ${
                state.extractionMethod === "fallback"
                  ? "border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 dark:to-transparent"
                  : "border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 dark:to-transparent"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      {state.extractionMethod === "fallback"
                        ? "Extraction Using Fallback Data"
                        : "Extraction Complete"}
                    </h2>
                    {state.extractionMethod === "gbak" && (
                      <span className="px-2 py-1 rounded-full bg-green-200 dark:bg-green-900 text-xs font-semibold text-green-900 dark:text-green-200">
                        Firebird gbak
                      </span>
                    )}
                    {state.extractionMethod === "firebird-library" && (
                      <span className="px-2 py-1 rounded-full bg-green-200 dark:bg-green-900 text-xs font-semibold text-green-900 dark:text-green-200">
                        Firebird Library
                      </span>
                    )}
                    {state.extractionMethod === "fallback" && (
                      <span className="px-2 py-1 rounded-full bg-amber-200 dark:bg-amber-900 text-xs font-semibold text-amber-900 dark:text-amber-200">
                        Fallback Mode
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {state.extractionMethod === "fallback"
                      ? "Unable to directly extract from the backup file. Using standard database structure as template."
                      : `Successfully extracted ${result.tables.length} table${result.tables.length !== 1 ? 's' : ''} from `}{" "}
                    <span className="font-mono text-foreground">{result.fileName}</span>
                  </p>
                  {state.message && (
                    <p className="text-xs text-muted-foreground mb-3 italic">
                      {state.message}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${state.extractionMethod === "fallback" ? "bg-amber-500" : "bg-primary"}`}></div>
                      <span className="text-muted-foreground">
                        {result.tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()} total rows
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${state.extractionMethod === "fallback" ? "bg-amber-500" : "bg-primary"}`}></div>
                      <span className="text-muted-foreground">
                        {result.tables.reduce((sum, t) => sum + t.columns.length, 0)} columns
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Select Tables to Download
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedTables.size} of {result.tables.length} tables selected
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:border-primary transition-colors">
                    <span className="text-muted-foreground">Format:</span>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
                      className="bg-transparent text-foreground font-semibold cursor-pointer outline-none"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </label>
                </div>

                <button
                  onClick={handleDownload}
                  disabled={selectedTables.size === 0 || isDownloading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isDownloading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download {selectedTables.size > 0 ? `(${selectedTables.size})` : ""}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid md:grid-cols-2 gap-4 animate-slide-up">
              {/* Select All */}
              <div
                onClick={handleSelectAll}
                className="md:col-span-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTables.size === result.tables.length}
                    readOnly
                    className="w-5 h-5 rounded border-slate-300 text-primary cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-foreground">Select All Tables</p>
                    <p className="text-sm text-muted-foreground">
                      {result.tables.length} tables available
                    </p>
                  </div>
                </label>
              </div>

              {/* Individual Tables */}
              {result.tables.map((table) => {
                const isSelected = selectedTables.has(table.name);
                return (
                  <div
                    key={table.name}
                    className={`rounded-lg border transition-all cursor-pointer group ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTableSelection(table.name)}
                            className="w-5 h-5 rounded border-slate-300 text-primary cursor-pointer mt-1"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Table2 className="w-4 h-4 text-primary" />
                              <h3 className="font-semibold text-foreground text-lg">
                                {table.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                              <span className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{table.rowCount.toLocaleString()}</span> rows
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{table.columns.length}</span> columns
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setViewingTable(table.name)}
                          className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-all"
                          title="Preview table structure"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                            Columns ({table.columns.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {table.columns.slice(0, 6).map((col) => (
                              <span
                                key={col}
                                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs text-foreground font-mono border border-slate-200 dark:border-slate-600"
                              >
                                {col}
                              </span>
                            ))}
                            {table.columns.length > 6 && (
                              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs text-muted-foreground font-mono">
                                +{table.columns.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          CSV
                        </div>
                        <div className="flex items-center gap-1">
                          <FileJson className="w-3 h-3" />
                          JSON
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
