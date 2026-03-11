'use client';

import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { 
  FileArchive, 
  Loader2, 
  Download, 
  Trash2,
  CheckCircle2,
  Gauge,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type CompressionLevel = 'low' | 'medium' | 'high';

export default function CompressTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [level, setLevel] = useState<CompressionLevel>('medium');
  const [progress, setProgress] = useState(0);
  const [newSize, setNewSize] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const getCompressionSettings = (lvl: CompressionLevel) => {
    switch(lvl) {
      case 'low': return { scale: 1.2, quality: 0.6 }; // Az Sıkıştırma
      case 'medium': return { scale: 0.8, quality: 0.4 }; // Normal Sıkıştırma
      case 'high': return { scale: 0.5, quality: 0.2 }; // Yüksek Sıkıştırma
    }
  };

  const handleFileSelected = (files: File[]) => {
    setFile(files[0]);
    setIsDone(false);
    setProgress(0);
    setNewSize(0);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const compressPDF = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
      const pdfDocsjs = await loadingTask.promise;
      const totalPages = pdfDocsjs.numPages;
      
      const newPdfDoc = await PDFDocument.create();
      const settings = getCompressionSettings(level);

      for (let i = 1; i <= totalPages; i++) {
        setProgress(Math.round(((i - 1) / totalPages) * 100));
        
        const page = await pdfDocsjs.getPage(i);
        const viewport = page.getViewport({ scale: settings.scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas
        }).promise;

        // Compress image using JPEG
        const imgDataUrl = canvas.toDataURL('image/jpeg', settings.quality);
        
        // Add to new PDF-lib document
        const pdfImage = await newPdfDoc.embedJpg(imgDataUrl);
        const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
        
        newPage.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
      }

      setProgress(100);
      
      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setNewSize(blob.size);
      
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setIsDone(true);

    } catch (error) {
      console.error('Compression error:', error);
      alert('Sıkıştırma sırasında bir hata oluştu. PDF çok büyük veya şifreli olabilir.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl || !file) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `kucultulmus_${file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">PDF Sıkıştır (Küçült)</h2>
        <p className="text-muted-foreground mt-2">
          Gereksiz ağırlıklardan kurtulun. PDF dosyanızın boyutunu web ve mail gönderimi için optimize edin.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Sıkıştırılacak PDF'i seçin" />
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* File Header */}
          <div className="p-4 sm:p-6 rounded-3xl border border-border bg-card flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-[200px]">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <FileArchive size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-base sm:text-lg">{file.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Orijinal Boyut: <strong>{formatBytes(file.size)}</strong></p>
              </div>
            </div>
            
            {!isProcessing && (
              <button 
                onClick={() => {
                  setFile(null);
                  setIsDone(false);
                  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                }}
                className="text-xs sm:text-sm text-destructive hover:underline shrink-0 flex items-center gap-1 px-2 py-1 bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 size={14} /> İptal
              </button>
            )}
          </div>

          {!isDone ? (
            <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Gauge size={20} className="text-indigo-500" /> Sıkıştırma Seviyesi
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Low Compression */}
                  <label className={cn(
                    "relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all hover:bg-secondary/50",
                    level === 'low' ? "border-indigo-500 bg-indigo-500/5" : "border-border"
                  )}>
                    <input 
                      type="radio" 
                      name="level" 
                      value="low" 
                      checked={level === 'low'} 
                      onChange={() => setLevel('low')} 
                      className="peer sr-only"
                    />
                    <span className="font-bold text-base mb-1">Az Sıkıştırma</span>
                    <span className="text-xs text-muted-foreground">Yüksek Kalite. Daha az dosya küçülmesi sağlar.</span>
                    {level === 'low' && <CheckCircle2 className="absolute top-4 right-4 text-indigo-500" size={18} />}
                  </label>

                  {/* Medium Compression */}
                  <label className={cn(
                    "relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all hover:bg-secondary/50",
                    level === 'medium' ? "border-indigo-500 bg-indigo-500/5" : "border-border"
                  )}>
                    <input 
                      type="radio" 
                      name="level" 
                      value="medium" 
                      checked={level === 'medium'} 
                      onChange={() => setLevel('medium')} 
                      className="peer sr-only"
                    />
                    <span className="font-bold text-base mb-1">Normal Sıkıştırma</span>
                    <span className="text-xs text-muted-foreground">Dengeli Kalite. Tavsiye edilen yöntemdir.</span>
                    {level === 'medium' && <CheckCircle2 className="absolute top-4 right-4 text-indigo-500" size={18} />}
                  </label>

                  {/* High Compression */}
                  <label className={cn(
                    "relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all hover:bg-secondary/50",
                    level === 'high' ? "border-indigo-500 bg-indigo-500/5" : "border-border"
                  )}>
                    <input 
                      type="radio" 
                      name="level" 
                      value="high" 
                      checked={level === 'high'} 
                      onChange={() => setLevel('high')} 
                      className="peer sr-only"
                    />
                    <span className="font-bold text-base mb-1">Maksimum Sıkıştırma</span>
                    <span className="text-xs text-muted-foreground">Düşük Kalite. Görseller bulanıklaşabilir.</span>
                    {level === 'high' && <CheckCircle2 className="absolute top-4 right-4 text-indigo-500" size={18} />}
                  </label>
                </div>

                <div className="flex gap-3 p-4 bg-muted/50 rounded-xl text-xs sm:text-sm text-muted-foreground border border-border">
                  <Info className="shrink-0 text-indigo-500" size={18} />
                  <p>Sıkıştırma işlemi (Render) tarayıcınızın gücüne ve PDF'in sayfa sayısına bağlı olarak birkaç saniye veya dakika sürebilir.</p>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span>İşleniyor...</span>
                    <span>%{progress}</span>
                  </div>
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                disabled={isProcessing}
                onClick={compressPDF}
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
                    Sıkıştırılıyor...
                  </>
                ) : (
                  <>
                    <FileArchive size={20} />
                    PDF'i Sıkıştır
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-8 sm:p-12 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={48} />
              </div>
              
              <h3 className="text-2xl font-bold">İşlem Tamamlandı! 🎉</h3>
              
              <div className="flex justify-center items-center gap-4 sm:gap-8 font-mono bg-card w-fit mx-auto p-4 rounded-2xl border border-border shadow-sm">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-sans">Eski Boyut</p>
                  <p className="text-lg text-destructive line-through decoration-destructive/50">{formatBytes(file.size)}</p>
                </div>
                <div className="text-2xl text-muted-foreground">→</div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-sans">Yeni Boyut</p>
                  <p className={cn("text-2xl font-bold", newSize > file.size ? "text-orange-500" : "text-emerald-500")}>{formatBytes(newSize)}</p>
                </div>
              </div>

              {/* Boyut tasarrufu hesabi */}
              {newSize < file.size ? (
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  %{Math.round((1 - (newSize / file.size)) * 100)} oranında tasarruf sağlandı!
                </p>
              ) : (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl max-w-lg mx-auto">
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    Sıkıştırma sonrası boyut arttı! 
                  </p>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
                    Bu dosya halihazırda son derece iyi sıkıştırılmış veya bolca metin/vektör barındırıyor. Böyle dökümanları tarayıcıda resme dönüştürüp sıkıştırmak boyutu artırabilir. Orijinal dosyayı kullanmaya devam edebilirsiniz.
                  </p>
                </div>
              )}
              
              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                 <button
                  onClick={() => {
                    setFile(null);
                    setIsDone(false);
                    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                  }}
                  className="px-6 py-3 border border-border bg-card hover:bg-secondary text-foreground rounded-xl font-bold transition-all"
                >
                  Yeni Dosya Seç
                </button>
                <button
                  onClick={handleDownload}
                  className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} /> İndir
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
