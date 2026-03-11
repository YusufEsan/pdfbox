'use client';

// Updated v2

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, Loader2, Download, Scissors, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SplitTool() {
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState('');
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

  const parseRanges = (input: string, maxPages: number) => {
    const parts = input.split(',').map(p => p.trim());
    const result: number[][] = [];

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= maxPages && start <= end) {
          result.push(Array.from({ length: end - start + 1 }, (_, i) => start + i - 1));
        }
      } else {
        const page = Number(part);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          result.push([page - 1]);
        }
      }
    }
    return result.flat();
  };

  const splitPDF = async () => {
    if (!file || !ranges) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const indicesToExtract = parseRanges(ranges, totalPages);
      
      if (indicesToExtract.length === 0) {
        alert('Lütfen geçerli sayfa aralıkları girin.');
        setIsProcessing(false);
        return;
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(sourcePdf, indicesToExtract);
      copiedPages.forEach(page => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `bolunmus_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Split error:', error);
      alert('Bölme işlemi sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">PDF Böl</h2>
        <p className="text-muted-foreground mt-2">
          PDF dosyanızdan belirli sayfaları ayıklayarak yeni bir belge oluşturun.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Bölünecek PDF dosyasını seçin" />
      ) : (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-border bg-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
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
              Değiştir
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              Ayıklanacak Sayfalar
              <Info size={14} className="text-muted-foreground" />
            </label>
            <input
              type="text"
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder='Örn: 1-3, 5, 8-10'
              className="w-full h-14 px-6 rounded-2xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground italic">Virgülle ayırın veya aralık belirtin (Örn: 1-5, 7, 10-12)</p>
          </div>

          <button
            disabled={!ranges || isProcessing}
            onClick={splitPDF}
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg",
              ranges && !isProcessing
                ? "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]" 
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
                <Scissors size={20} />
                Sayfaları Ayıkla ve İndir
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
