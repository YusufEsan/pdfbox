'use client';

import React, { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, Loader2, Download, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PageItem {
  index: number; // 1-based
  thumbnail: string;
  selected: boolean;
}

export default function DeleteTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [pages, setPages] = useState<PageItem[]>([]);

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

  // Load thumbnails when file is selected
  useEffect(() => {
    if (!file || totalPages === 0) return;
    loadThumbnails();
  }, [file, totalPages]);

  const loadThumbnails = async () => {
    if (!file) return;
    setIsLoadingThumbnails(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      const loadedPages: PageItem[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;

        loadedPages.push({
          index: i,
          thumbnail: canvas.toDataURL('image/jpeg', 0.7),
          selected: false,
        });
      }

      setPages(loadedPages);
    } catch (error) {
      console.error('Error loading thumbnails:', error);
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const togglePage = (index: number) => {
    setPages(prev => prev.map(p => 
      p.index === index ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectedCount = pages.filter(p => p.selected).length;

  const processPDF = async () => {
    if (!file || selectedCount === 0) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      const indicesToDelete = pages
        .filter(p => p.selected)
        .map(p => p.index - 1)
        .sort((a, b) => b - a); // Reverse order to keep indices valid

      if (indicesToDelete.length === totalPages) {
        alert('Tüm sayfaları silemezsiniz.');
        setIsProcessing(false);
        return;
      }

      indicesToDelete.forEach(index => {
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Sayfa Sil</h2>
        <p className="text-muted-foreground mt-2">
          Silmek istediğiniz sayfaları görsellere tıklayarak seçin.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Düzenlenecek PDF dosyasını seçin" />
      ) : (
        <div className="space-y-6">
          <div className="p-4 sm:p-6 rounded-3xl border border-border bg-card flex items-center gap-3 sm:gap-4 relative overflow-hidden">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <FileText size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-base sm:text-lg">{file.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{totalPages} Sayfa • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={() => { setFile(null); setPages([]); }}
              className="text-xs sm:text-sm text-destructive hover:underline shrink-0"
            >
              Değiştir
            </button>
          </div>

          {isLoadingThumbnails ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 bg-card/30 border border-border border-dashed rounded-3xl">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Sayfalar yükleniyor...</p>
            </div>
          ) : pages.length > 0 && (
            <>
              {selectedCount > 0 && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                  <p className="text-sm font-medium text-red-500">
                    {selectedCount} sayfa silinecek
                  </p>
                  <button
                    onClick={() => setPages(prev => prev.map(p => ({ ...p, selected: false })))}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Seçimi Temizle
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                {pages.map((page) => (
                  <button
                    key={page.index}
                    onClick={() => togglePage(page.index)}
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 transition-all group",
                      page.selected
                        ? "border-red-500 ring-2 ring-red-500/30 scale-95"
                        : "border-border hover:border-primary/50 hover:shadow-md"
                    )}
                  >
                    <div className="aspect-[3/4] bg-muted">
                      <img
                        src={page.thumbnail}
                        alt={`Sayfa ${page.index}`}
                        className={cn(
                          "w-full h-full object-cover transition-all",
                          page.selected && "opacity-40 blur-[1px]"
                        )}
                      />
                    </div>
                    {page.selected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                          <X className="text-white" size={18} />
                        </div>
                      </div>
                    )}
                    <div className={cn(
                      "absolute bottom-0 left-0 right-0 py-1 text-center text-xs font-bold",
                      page.selected 
                        ? "bg-red-500 text-white" 
                        : "bg-black/60 text-white"
                    )}>
                      {page.index}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            disabled={selectedCount === 0 || isProcessing}
            onClick={processPDF}
            className={cn(
              "w-full h-12 sm:h-14 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all",
              selectedCount > 0 && !isProcessing
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
                {selectedCount > 0 ? `${selectedCount} Sayfayı Sil ve İndir` : 'Silinecek Sayfaları Seçin'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
