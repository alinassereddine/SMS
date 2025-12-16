import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any, row: any) => string;
}

interface ExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  buttonText?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCSV(data: any[], columns: ExportColumn[]): string {
  const headers = columns.map((col) => escapeCSV(col.header)).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = col.format
          ? col.format(row[col.key], row)
          : formatValue(row[col.key]);
        return escapeCSV(value);
      })
      .join(",")
  );
  return [headers, ...rows].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportButton({
  data,
  columns,
  filename,
  buttonText = "Export",
  variant = "outline",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = (format: "csv") => {
    setIsExporting(true);
    try {
      if (data.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no records to export.",
          variant: "destructive",
        });
        return;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}_${timestamp}.${format}`;

      if (format === "csv") {
        const csv = generateCSV(data, columns);
        downloadFile(csv, fullFilename, "text/csv;charset=utf-8;");
      }

      toast({
        title: "Export successful",
        description: `Downloaded ${fullFilename}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={() => handleExport("csv")}
      disabled={isExporting || data.length === 0}
      data-testid="button-export"
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : buttonText}
    </Button>
  );
}

export function ExportMenuButton({
  data,
  columns,
  filename,
  buttonText = "Export",
  variant = "outline",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = (format: "csv") => {
    setIsExporting(true);
    try {
      if (data.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no records to export.",
          variant: "destructive",
        });
        return;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}_${timestamp}.${format}`;

      if (format === "csv") {
        const csv = generateCSV(data, columns);
        downloadFile(csv, fullFilename, "text/csv;charset=utf-8;");
      }

      toast({
        title: "Export successful",
        description: `Downloaded ${fullFilename}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          disabled={isExporting || data.length === 0}
          data-testid="button-export-menu"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : buttonText}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")} data-testid="menu-item-export-csv">
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
