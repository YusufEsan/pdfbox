'use client';

import React, { useState } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, Loader2, Download, Type, Info, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState('TASLAK');
  const [fontSize, setFontSize] = useState(60);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);
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

  const processPDF = async () => {
    if (!file || !watermarkText) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdf.embedFont(StandardFonts.HelveticaBold);
      
      const pages = pdf.getPages();
      
      for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = helveticaFont.heightAtSize(fontSize);
        
        // PDF-lib rotates around the (x, y) point (bottom-left of text)
        // To center rotated text, we need to calculate the offset
        const angleRad = ((-rotation) * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        // Offset from (x,y) to the center of the text rectangle
        const tx = textWidth / 2;
        const ty = textHeight / 2;
        
        // Rotated offset
        const rx = tx * cos - ty * sin;
        const ry = tx * sin + ty * cos;
        
        // Draw the watermark centered
        page.drawText(watermarkText, {
          x: width / 2 - rx,
          y: height / 2 - ry,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
          opacity: opacity,
          rotate: degrees(-rotation),
        });
      }

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `filigranli_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Processing error:', error);
      alert('Filigran ekleme sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Filigran Ekle</h2>
        <p className="text-muted-foreground mt-2">
          PDF sayfalarınıza yarı saydam metin tabanlı bir filigran ekleyin.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Filigran eklenecek PDF dosyasını seçin" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6 order-2 lg:order-1">
            <div className="p-6 rounded-3xl border border-border bg-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
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

            <div className="space-y-4 p-6 rounded-3xl border border-border bg-card">
              <h3 className="font-bold flex items-center gap-2">
                <Sliders size={18} /> Ayarlar
              </h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium mb-3 block">Filigran Metni</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-secondary border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Yazı Boyutu ({fontSize}px)</label>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Opasite ({(opacity * 100).toFixed(0)}%)</label>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Döndürme ({rotation}°)</label>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <button
              disabled={!watermarkText || isProcessing}
              onClick={processPDF}
              className={cn(
                "w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg",
                watermarkText && !isProcessing
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
                  <Download size={20} />
                  Filigran Ekle ve İndir
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center bg-secondary/50 rounded-3xl border border-dashed border-border p-8 min-h-[250px] lg:min-h-[400px] order-1 lg:order-2">
             <div className="text-center space-y-4">
                <div className="relative w-48 h-64 bg-white shadow-2xl rounded-sm mx-auto flex items-center justify-center overflow-hidden border border-border">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[var(--op)]" style={{ '--op': opacity } as any}>
                    <p 
                      className="text-gray-500 font-bold whitespace-nowrap"
                      style={{ 
                        fontSize: fontSize / 4, 
                        transform: `rotate(${rotation}deg)`,
                      }}
                    >
                      {watermarkText}
                    </p>
                  </div>
                  <div className="space-y-2 px-4 opacity-20">
                    <div className="w-full h-2 bg-gray-200" />
                    <div className="w-4/5 h-2 bg-gray-200" />
                    <div className="w-full h-2 bg-gray-200" />
                    <div className="w-3/4 h-2 bg-gray-200" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-medium">Önizleme (Yaklaşık)</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
