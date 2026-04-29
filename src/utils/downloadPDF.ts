import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "./getCompanyId";

interface CompanyInfo {
  name: string;
  logo_url: string | null;
}

let cachedCompany: CompanyInfo | null = null;

export const getCompanyInfo = async (): Promise<CompanyInfo> => {
  if (cachedCompany) return cachedCompany;
  const companyId = await getCompanyId();
  const { data } = await supabase
    .from("companies")
    .select("name, logo_url")
    .eq("id", companyId)
    .single();
  cachedCompany = { name: data?.name || "Company", logo_url: data?.logo_url || null };
  return cachedCompany;
};

export const clearCompanyInfoCache = () => { cachedCompany = null; };

interface PDFOptions {
  title: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  /** Optional summary lines printed under the title, e.g. ["Total: 12,000"] */
  summary?: string[];
}

export async function downloadPDF({ title, filename, headers, rows, summary }: PDFOptions) {
  const company = await getCompanyInfo();
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Company header (logo + name)
  let cursorY = 40;
  let textX = 40;

  if (company.logo_url) {
    try {
      const res = await fetch(company.logo_url);
      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const fmt = blob.type.includes("png") ? "PNG" : "JPEG";
      doc.addImage(dataUrl, fmt, 40, 25, 40, 40);
      textX = 90;
    } catch {
      // ignore logo failure
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(company.name, textX, cursorY);
  cursorY += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(title, textX, cursorY);
  cursorY += 14;

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, textX, cursorY);
  cursorY += 4;

  if (summary && summary.length) {
    cursorY += 10;
    doc.setFontSize(10);
    doc.setTextColor(40);
    summary.forEach((line) => {
      doc.text(line, textX, cursorY);
      cursorY += 12;
    });
  }

  doc.setTextColor(0);

  const formatCell = (c: string | number | null | undefined): string => {
    if (c == null) return "";
    if (typeof c === "number" && Number.isFinite(c)) {
      // 1,000 / 1,000,000 — preserve up to 2 decimals where present
      return c.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }
    return String(c);
  };

  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map(formatCell)),
    startY: cursorY + 10,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [41, 55, 72], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `${company.name} • Page ${doc.getNumberOfPages()}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
    },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
