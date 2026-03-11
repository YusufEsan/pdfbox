'use client';

import React, { useState, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { 
  ImageIcon, 
  Download, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  X,
  Layers,
  Archive,
  Monitor,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUpload from '../FileUpload';
import JSZip from 'jszip';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PageImage {
  index: number;
  dataUrl: string;
}

export default function PdfToImgTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<PageImage[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'auto' | '16-9'>('auto');
  const [isZipping, setIsZipping] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelected = (files: File[]) => {
    setFile(files[0]);
    setImages([]);
    setIsDone(false);
    setSelectedIndices(new Set());
  };

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const selectAll = () => {
    if (selectedIndices.size === images.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(images.map(img => img.index)));
    }
  };

  const convertPdfToImages = async () => {
    if (!file) return;
    setIsProcessing(true);
    setSelectedIndices(new Set());

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const convertedImages: PageImage[] = [];
      let totalAspectRatio = 0;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality
        
        // Track aspect ratio (width / height)
        totalAspectRatio += (viewport.width / viewport.height);

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

        convertedImages.push({
          index: i,
          dataUrl: canvas.toDataURL('image/png')
        });
      }

      // If average aspect ratio is close to 16:9 (1.77)
      const avgRatio = totalAspectRatio / totalPages;
      if (avgRatio > 1.5) {
        setAspectRatio('16-9');
      } else {
        setAspectRatio('auto');
      }

      setImages(convertedImages);
      setIsDone(true);
    } catch (error) {
      console.error('Conversion error:', error);
      alert('Dönüştürme sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `sayfa_${index}.png`;
    link.click();
  };

  const downloadZip = async (indicesToDownload?: number[]) => {
    const targetImages = indicesToDownload 
      ? images.filter(img => indicesToDownload.includes(img.index))
      : images;

    if (targetImages.length === 0) return;
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      
      targetImages.forEach((img) => {
        const base64Data = img.dataUrl.split(',')[1];
        zip.file(`sayfa_${img.index}.png`, base64Data, { base64: true });
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = url;
      const filename = indicesToDownload ? 'secilen_gorseller.zip' : 'tum_gorseller.zip';
      link.download = `${file?.name?.replace('.pdf', '') || 'pdf'}_${filename}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Zip error:', error);
      alert('ZIP dosyası oluşturulurken bir hata oluştu.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">PDF&apos;den Görsele</h2>
        <p className="text-muted-foreground mt-2">
          PDF sayfalarınızı yüksek kaliteli PNG formatına dönüştürün.
        </p>
      </div>

      {!file ? (
        <FileUpload 
          onFilesSelected={handleFileSelected} 
          multiple={false} 
          label="Görsele dönüştürülecek PDF dosyasını seçin" 
        />
      ) : (
        <div className="space-y-6">
          {/* File Info & Global Actions */}
          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate max-w-[150px] sm:max-w-xs">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {!isProcessing && !isDone && (
                  <button 
                    onClick={() => setFile(null)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors shrink-0 sm:hidden"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {isDone && (
                  <>
                    <button 
                      onClick={() => {
                        setFile(null);
                        setImages([]);
                        setIsDone(false);
                        setSelectedIndices(new Set());
                      }}
                      className="h-10 px-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-xs font-bold transition-all border border-border/50 flex items-center gap-2 order-first shrink-0"
                      title="Yeni Dosya"
                    >
                      <X className="rotate-45" size={16} />
                      Yeni
                    </button>

                    <button
                      onClick={selectAll}
                      className="h-10 px-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-xs font-bold transition-all border border-border/50 flex items-center gap-2"
                    >
                      <Layers size={16} />
                      {selectedIndices.size === images.length ? 'Bırak' : 'Seç'}
                    </button>

                    {selectedIndices.size > 0 && (
                      <button
                        onClick={() => setSelectedIndices(new Set())}
                        className="h-10 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all border border-red-500/20 flex items-center gap-2"
                        title="Temizle"
                      >
                        <Trash2 size={16} />
                        Temizle
                      </button>
                    )}

                    <button
                      disabled={isZipping}
                      onClick={() => downloadZip(selectedIndices.size > 0 ? Array.from(selectedIndices) : undefined)}
                      className="h-10 px-4 bg-green-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-600/20"
                    >
                      {isZipping ? <Loader2 className="animate-spin" size={16} /> : <Archive size={16} />}
                      {selectedIndices.size > 0 ? `İndir (${selectedIndices.size})` : 'Tümünü İndir'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {!isDone ? (
            <button
              disabled={isProcessing}
              onClick={convertPdfToImages}
              className={cn(
                "w-full h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl",
                isProcessing 
                  ? "bg-muted text-muted-foreground cursor-wait" 
                  : "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] shadow-primary/20"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Dönüştürülüyor...
                </>
              ) : (
                <>
                  <ImageIcon size={24} />
                  Sayfaları Görsele Dönüştür
                </>
              )}
            </button>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div 
                    key={img.index} 
                    className={cn(
                      "group relative rounded-2xl border-4 transition-all cursor-pointer overflow-hidden",
                      selectedIndices.has(img.index) 
                        ? "border-green-600 shadow-xl shadow-green-600/20 scale-[0.98]" 
                        : "border-border hover:border-primary/50 bg-card shadow-sm"
                    )}
                    onClick={() => toggleSelection(img.index)}
                  >
                    <div className={cn(
                      "relative w-full overflow-hidden",
                      aspectRatio === '16-9' ? "aspect-video" : "aspect-[3/4]"
                    )}>
                      <img 
                        src={img.dataUrl} 
                        alt={`Sayfa ${img.index}`} 
                        className={cn(
                          "w-full h-full transition-all duration-300",
                          aspectRatio === '16-9' ? "object-contain bg-muted/20" : "object-cover",
                          selectedIndices.has(img.index) && "blur-[2px] opacity-80"
                        )}
                      />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             downloadImage(img.dataUrl, img.index);
                           }}
                           className="p-3 bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg"
                           title="Bu Sayfayı İndir"
                         >
                           <Download size={20} />
                         </button>
                      </div>
                    </div>
                    <div className={cn(
                      "p-3 flex justify-between items-center border-t border-border/50 transition-colors",
                      selectedIndices.has(img.index) ? "bg-green-600/5" : "bg-card"
                    )}>
                      <span className="text-xs font-bold text-muted-foreground">Sayfa {img.index}</span>
                      {selectedIndices.has(img.index) && (
                        <CheckCircle2 size={22} strokeWidth={2.5} className="text-green-600 fill-green-600/10" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xl font-outfit">
                  <CheckCircle2 size={24} />
                  İşlem Tamamlandı!
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
