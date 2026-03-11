'use client';

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, Loader2, Download, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DeleteTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pagesToDelete, setPagesToDelete] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const handleFileSelected = async (files: File[]) => {
    const selectedFile = files[0];
    setFile(selectedFile);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdf.getPageCount());
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const parsePageRanges = (input: string, maxPages: number) => {
    const pages = new Set<number>();
    const parts = input.split(',').map(p => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i >= 1 && i <= maxPages) pages.add(i - 1);
          }
        }
      } else {
        const page = Number(part);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          pages.add(page - 1);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const processPDF = async () => {
    if (!file || !pagesToDelete) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      
      const indicesToDelete = parsePageRanges(pagesToDelete, totalPages);
      
      if (indicesToDelete.length === 0) {
        alert('Lütfen geçerli sayfa numaraları girin.');
        setIsProcessing(false);
        return;
      }

      if (indicesToDelete.length === totalPages) {
        alert('Tüm sayfaları silemezsiniz.');
        setIsProcessing(false);
        return;
      }

      // We need to delete in reverse order to keep indices valid
      indicesToDelete.sort((a, b) => b - a).forEach(index => {
        pdf.removePage(index);
      });

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `duzenlenmis_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Processing error:', error);
      alert('İşlem sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sayfa Sil</h2>
        <p className="text-muted-foreground mt-2">
          PDF dosyanızdan çıkartmak istediğiniz sayfa numaralarını belirleyin.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Düzenlenecek PDF dosyasını seçin" />
      ) : (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-border bg-card flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-lg">{file.name}</p>
              <p className="text-sm text-muted-foreground">{totalPages} Sayfa • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={() => setFile(null)}
              className="text-sm text-destructive hover:underline"
            >
              Dosyayı Değiştir
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              Silinecek Sayfalar
              <div className="group relative">
                <Info size={14} className="text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-xl border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                  Örnek: "1, 3, 5-8" (Virgülle ayırın veya aralık belirtin)
                </div>
              </div>
            </label>
            <input
              type="text"
              value={pagesToDelete}
              onChange={(e) => setPagesToDelete(e.target.value)}
              placeholder='Örn: 1, 3, 5-8'
              className="w-full h-14 px-6 rounded-2xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <button
            disabled={!pagesToDelete || isProcessing}
            onClick={processPDF}
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
              pagesToDelete && !isProcessing
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]" 
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" />
                İşleniyor...
              </>
            ) : (
              <>
                <Trash2 size={20} />
                Seçili Sayfaları Sil ve İndir
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
