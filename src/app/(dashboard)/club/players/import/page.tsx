"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Upload, Download, CheckCircle, XCircle } from "lucide-react";

const CSV_TEMPLATE = `firstName,lastName,email,phone,dateOfBirth,gender,nationality,position,jerseyNumber
John,Smith,john@example.com,+1234567890,1995-06-15,male,South African,midfielder,10
Jane,Doe,jane@example.com,,1998-03-22,female,British,goalkeeper,1`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hockey-connect-players-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type PreviewRow = Record<string, string>;
interface ParseError { row: number; message: string }

export default function ImportClubPlayersPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: PreviewRow[]; errors: ParseError[]; validCount: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!csvText || !profile?.clubId) return;
    setPreviewing(true);
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/players/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, preview: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to parse CSV", variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!csvText || !profile?.clubId || !preview) return;
    if (preview.errors.length > 0) {
      toast({ title: "Fix errors first", description: "Resolve all CSV errors before importing.", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/players/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Import complete", description: `${data.imported} players imported successfully.` });
      router.push("/club/players");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Import failed", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell title="Import Players" description="Bulk import players from a CSV file.">
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 1: Download Template</CardTitle>
              <CardDescription>
                Use the official CSV template to ensure your data is formatted correctly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
              <p className="mt-3 text-xs text-gray-500">
                Required columns: <strong>firstName</strong>, <strong>lastName</strong>. All other columns are optional.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 2: Upload Your CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{csvText ? "File loaded — click to replace" : "Click to select a CSV file"}</p>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </div>
              {csvText && (
                <Button onClick={handlePreview} disabled={previewing} variant="outline">
                  {previewing ? "Parsing..." : "Preview Import"}
                </Button>
              )}
            </CardContent>
          </Card>

          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Step 3: Review &amp; Import
                  <Badge variant={preview.errors.length === 0 ? "success" : "destructive"}>
                    {preview.validCount} valid / {preview.errors.length} errors
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {preview.errors.length > 0 && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-4 space-y-1">
                    <p className="text-sm font-medium text-red-700 flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> Errors found — fix your CSV and re-upload
                    </p>
                    {preview.errors.map((err) => (
                      <p key={err.row} className="text-xs text-red-600">Row {err.row}: {err.message}</p>
                    ))}
                  </div>
                )}
                {preview.errors.length === 0 && (
                  <div className="rounded-md bg-green-50 border border-green-200 p-4 flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    All {preview.validCount} rows are valid and ready to import.
                  </div>
                )}

                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview.headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {preview.headers.map((h) => (
                            <td key={h} className="px-3 py-2 text-gray-700">{row[h] || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.rows.length > 5 && (
                    <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t">
                      ...and {preview.rows.length - 5} more rows
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleImport} disabled={importing || preview.errors.length > 0}>
                    {importing ? "Importing..." : `Import ${preview.validCount} Players`}
                  </Button>
                  <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
