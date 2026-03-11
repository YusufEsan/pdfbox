'use client';

import React, { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, Loader2, Download, Trash2, Hash, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as pdfjs from 'pdfjs-dist';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export default function AddPageNumbersTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAspectRatio, setPreviewAspectRatio] = useState<number>(3/4);
  
  // Customization state
  const [position, setPosition] = useState<Position>('bottom-center');
  const [format, setFormat] = useState<string>('{n} / {t}'); // default format
  const [fontSize, setFontSize] = useState<number>(12);

  const handleFileSelected = async (files: File[]) => {
    const selectedFile = files[0];
    setFile(selectedFile);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdf.getPageCount());

      // Generate preview of the first page
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
      const pdfjsDoc = await loadingTask.promise;
      const page = await pdfjsDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
        setPreviewAspectRatio(viewport.width / viewport.height);
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const processPDF = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const numCount = pages.length;

      for (let i = 0; i < numCount; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        
        // Replace templates {n} and {t}
        let text = format.replace('{n}', (i + 1).toString()).replace('{t}', numCount.toString());
        
        // Approximate width calculation (since standard font isn't embedded yet, assuming 0.5 * fontSize per char)
        const textWidth = text.length * fontSize * 0.5;
        
        const marginX = 40;
        const marginY = 40;
        
        let x = 0;
        let y = 0;

        switch (position) {
          case 'top-left': x = marginX; y = height - marginY; break;
          case 'top-center': x = (width / 2) - (textWidth / 2); y = height - marginY; break;
          case 'top-right': x = width - marginX - textWidth; y = height - marginY; break;
          case 'bottom-left': x = marginX; y = marginY; break;
          case 'bottom-center': x = (width / 2) - (textWidth / 2); y = marginY; break;
          case 'bottom-right': x = width - marginX - textWidth; y = marginY; break;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          color: rgb(0.1, 0.1, 0.1), // Almost black
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `numarali_${file.name}`;
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Sayfa Numarası Ekle</h2>
        <p className="text-muted-foreground mt-2">
          PDF sayfalarınıza istediğiniz hizalama ve formatta numaralandırma uygulayın.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Numara eklenecek PDF'i seçin" />
      ) : (
        <div className="space-y-6">
          <div className="p-4 sm:p-6 rounded-3xl border border-border bg-card flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Hash size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-base sm:text-lg">{file.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{totalPages} Sayfa • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={() => setFile(null)}
              className="text-xs sm:text-sm text-destructive hover:underline shrink-0 flex items-center gap-1"
            >
              <Trash2 size={14} /> Temizle
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Ayarlar Kolonu */}
            <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl border border-border bg-card space-y-6">
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Konum</h3>
                <div className="grid grid-rows-2 gap-3 max-w-[200px] mx-auto w-full">
                  <div className="flex justify-between gap-3">
                    <button 
                      onClick={() => setPosition('top-left')}
                      className={cn("p-3 rounded-lg border-2 transition-all flex rotate-180", position === 'top-left' ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground")}
                    ><AlignRight size={18} /></button>
                    <button 
                      onClick={() => setPosition('top-center')}
                      className={cn("p-3 rounded-lg border-2 transition-all flex", position === 'top-center' ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground")}
                    ><AlignCenter size={18} className="rotate-180" /></button>
                    <button 
                      onClick={() => setPosition('top-right')}
                      className={cn("p-3 rounded-lg border-2 transition-all flex", position === 'top-right' ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground")}
                    ><AlignRight size={18} className="rotate-180" /></button>
                  </div>
                  <div className="flex justify-between gap-3">
                    <button 
                      onClick={() => setPosition('bottom-left')}
                      className={cn("p-3 rounded-lg border-2 transition-all flex", position === 'bottom-left' ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground")}
                    ><AlignLeft size={18} /></button>
                    <button 
                      onClick={() => setPosition('bottom-center')}
                      className={cn("p-3 rounded-lg border-2 transition-all flex", position === 'bottom-center' ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground")}
                    ><AlignCenter size={18} /></button>
                    <button 
                      onClick={() => setPosition('bottom-right')}
                      className={cn("p-3 rounded-lg border-2 transition-all flex", position === 'bottom-right' ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground")}
                    ><AlignRight size={18} /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Özelleştirme */}
            <div className="p-6 rounded-3xl border border-border bg-card space-y-6">
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Type size={16} /> Metin Formatı
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Format Stili</label>
                    <select 
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    >
                      <option value="{n}">{`1 (Sadece Numara)`}</option>
                      <option value="- {n} -">{`- 1 -`}</option>
                      <option value="Sayfa {n}">{`Sayfa 1`}</option>
                      <option value="Sayfa {n} / {t}">{`Sayfa 1 / Toplam`}</option>
                      <option value="{n} of {t}">{`1 of Toplam`}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                      <span>Yazı Tipi Boyutu</span>
                      <span className="text-primary font-bold">{fontSize}px</span>
                    </label>
                    <input 
                      type="range" 
                      min="8" 
                      max="48" 
                      step="2"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Canlı Önizleme */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="p-4 sm:p-6 rounded-3xl border border-border bg-card flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider flex items-center justify-between">
                  <span>Canlı Önizleme</span>
                  <span className="text-xs font-normal Normal-case px-2 py-1 bg-secondary rounded-md text-primary">{position}</span>
                </h3>
                
                <div className="flex-1 min-h-[400px] flex items-center justify-center bg-secondary/30 rounded-2xl border border-border/50 p-4 sm:p-8 overflow-hidden relative">
                  {previewUrl ? (
                    <div 
                      className="relative bg-white shadow-xl flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700 pointer-events-none"
                      style={{ 
                        aspectRatio: previewAspectRatio,
                        width: previewAspectRatio > 1 ? '100%' : 'auto',
                        height: previewAspectRatio > 1 ? 'auto' : '100%',
                        maxHeight: '100%',
                        maxWidth: '100%'
                      }}
                    >
                      <img src={previewUrl} alt="İlk sayfa önizleme" className="w-full h-full object-contain" />
                      
                      {/* Önizleme Sayfa Numarası Overlayer */}
                      <div 
                        className="absolute tracking-tight font-medium text-black"
                        style={{
                          fontSize: `${Math.max(10, fontSize * 0.7)}px`, // Görsel önizleme için fontu biraz scale ediyoruz
                          ...(position.includes('top') ? { top: '8%' } : { bottom: '8%' }),
                          ...(position.includes('left') ? { left: '8%' } : {}),
                          ...(position.includes('right') ? { right: '8%' } : {}),
                          ...(position.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                        }}
                      >
                        {format.replace('{n}', '1').replace('{t}', totalPages.toString())}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="animate-spin" size={32} />
                      <p className="text-sm font-medium">Önizleme hazırlanıyor...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Aksiyon */}
          <button
            disabled={isProcessing}
            onClick={processPDF}
            className={cn(
              "w-full h-12 sm:h-14 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all",
              !isProcessing
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
                <Download size={20} />
                Numaraları Ekle ve İndir
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
