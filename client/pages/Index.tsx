import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Database, FileJson, DownloadCloud, Shield, Zap, Loader } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = async (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".shuleprobackup")) {
      setError("Please select a SHULEPROBACKUP backup file");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError("File size exceeds 500MB limit");
      return;
    }

    setFileName(file.name);
    selectedFileRef.current = file;
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleProcessFile = async () => {
    if (!selectedFileRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Read file as base64 using FileReader
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64String = result.split(',')[1]; // Extract base64 part from data URL
          resolve(base64String);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(selectedFileRef.current!);
      });

      // Send to server
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFileRef.current.name,
          fileBuffer: base64,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to process file");
      }

      const data = await response.json();

      // Navigate to results page with extraction data
      navigate("/results", {
        state: {
          fileName: selectedFileRef.current.name,
          tables: data.tables,
          sessionId: data.sessionId,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">FirebirdExtract</h1>
              <p className="text-sm text-muted-foreground">Database Conversion Tool</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Hero Section */}
        <div className="mb-16 animate-fade-in">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Convert Database Backups
              <span className="block text-primary mt-2">to Modern Formats</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your SHULEPROBACKUP backup files and extract tables to CSV or JSON.
              Powered by embedded Firebird runtime with zero external dependencies.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!fileName ? handleUploadClick : undefined}
            className={`
              relative rounded-2xl border-2 border-dashed transition-all duration-200
              ${fileName ? "" : "cursor-pointer"}
              ${isDragging
                ? "border-primary bg-primary/5"
                : "border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/30 hover:border-primary/50"
              }
              p-8 md:p-12
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".SHULEPROBACKUP"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-4">
              <div className="p-4 rounded-xl bg-primary/10">
                <Upload
                  className={`w-8 h-8 transition-colors ${isDragging ? "text-primary" : "text-slate-400"}`}
                />
              </div>

              {fileName ? (
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{fileName}</p>
                  <p className="text-sm text-muted-foreground mt-1">Ready to process</p>
                  <button
                    onClick={handleProcessFile}
                    disabled={isLoading}
                    className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Extract Tables
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setFileName(null);
                      selectedFileRef.current = null;
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="mt-2 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Choose different file
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {isDragging ? "Drop your file here" : "Drag and drop your SHULEPROBACKUP file"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    or click to browse
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4">
                Supports SHULEPROBACKUP files (up to 500MB)
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16 animate-slide-up">
          {/* Feature 1 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <FileJson className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Multiple Formats</h3>
            <p className="text-sm text-muted-foreground">
              Export tables to CSV or JSON formats for use in modern applications.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Embedded Runtime</h3>
            <p className="text-sm text-muted-foreground">
              Uses Firebird 2.5 embedded runtime for direct database access and extraction.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Secure Processing</h3>
            <p className="text-sm text-muted-foreground">
              Files are processed locally with standard Firebird SYSDBA credentials.
            </p>
          </div>
        </div>

        {/* Technical Info */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 animate-slide-up">
          <h3 className="text-xl font-semibold text-foreground mb-6">Technical Details</h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">File Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  SHULEPROBACKUP backup file format
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Firebird 2.5 compatible backup
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Physically consistent and ready for restoration
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Extraction Process</h4>
              <p className="text-sm text-muted-foreground mb-4">
                The tool connects using the Firebird embedded runtime with default credentials:
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm">
                <div className="text-muted-foreground">
                  <div>User: <span className="text-foreground">SYSDBA</span></div>
                  <div>Password: <span className="text-foreground">masterkey</span></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">What You Get</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-primary flex-shrink-0" />
                  Selectable tables from your database
                </li>
                <li className="flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-primary flex-shrink-0" />
                  CSV export with headers and data
                </li>
                <li className="flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-primary flex-shrink-0" />
                  JSON export for API integration
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Ready to convert? Upload a Firebird database file above to get started.
          </p>
        </div>
      </main>
    </div>
  );
}
