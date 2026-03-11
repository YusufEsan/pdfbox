'use client';

import React, { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, Loader2, Download, RotateCw, RotateCcw, Trash2, Info, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as pdfjs from 'pdfjs-dist';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function RotateTool() {
  const [file, setFile] = useState<File | null>(null);
  const [rotationMode, setRotationMode] = useState<'all' | 'individual'>('all');
  const [rotation, setRotation] = useState(0); 
  const [individualRotations, setIndividualRotations] = useState<number[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const generatePreviews = async (arrayBuffer: ArrayBuffer) => {
    try {
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const previewUrls: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport, canvas: canvas }).promise;
          previewUrls.push(canvas.toDataURL());
        }
      }
      setPreviews(previewUrls);
    } catch (error) {
      console.error('Error generating previews:', error);
    }
  };

  const handleFileSelected = async (files: File[]) => {
    const selectedFile = files[0];
    setFile(selectedFile);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const count = pdf.getPageCount();
      setTotalPages(count);
      setRotation(0);
      setIndividualRotations(new Array(count).fill(0));
      setRotationMode('all');
      
      // Generate previews
      generatePreviews(arrayBuffer);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const rotatePDF = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const currentRotation = page.getRotation().angle;
        const addedRotation = rotationMode === 'all' ? rotation : individualRotations[i];
        if (addedRotation !== 0) {
          page.setRotation(degrees(currentRotation + addedRotation));
        }
      }

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `dondurulmus_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Rotation error:', error);
      alert('Döndürme işlemi sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">PDF Döndür</h2>
        <p className="text-muted-foreground mt-2">
          PDF sayfalarınızı 90, 180 veya 270 derece döndürün.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Döndürülecek PDF dosyasını seçin" />
      ) : (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-border bg-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <RotateCw size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-lg">{file.name}</p>
              <p className="text-sm text-muted-foreground">{totalPages} Sayfa • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={() => {
                setFile(null);
                setPreviews([]);
              }}
              className="text-sm text-destructive hover:underline"
            >
              Değiştir
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex p-1 bg-secondary rounded-2xl w-fit mx-auto scale-110 mb-4">
              <button
                onClick={() => setRotationMode('all')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  rotationMode === 'all' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tümünü Döndür
              </button>
              <button
                onClick={() => setRotationMode('individual')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  rotationMode === 'individual' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sayfa Bazlı Döndür
              </button>
            </div>

            {rotationMode === 'all' ? (
              <div className="p-4 sm:p-8 rounded-3xl border border-border bg-card max-w-2xl mx-auto">
                <label className="text-sm font-bold block mb-6 text-center text-muted-foreground">Tüm sayfalar için dönüş yönü seçin</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[0, 90, 180, 270].map((angle) => (
                    <button
                      key={angle}
                      onClick={() => setRotation(angle)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                        rotation === angle 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-border hover:border-primary/30 hover:bg-secondary"
                      )}
                    >
                      <div className="relative w-12 h-16 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-sm shadow-sm flex items-center justify-center overflow-hidden">
                        {previews[0] ? (
                          <img 
                            src={previews[0]} 
                            alt="page preview" 
                            className="w-full h-full object-contain transition-transform duration-300"
                            style={{ transform: `rotate(${angle}deg)` }}
                          />
                        ) : (
                          <FileText 
                            className="text-zinc-400 dark:text-zinc-500 transition-transform duration-300" 
                            style={{ transform: `rotate(${angle}deg)` }}
                            size={24} 
                          />
                        )}
                      </div>
                      <span className="font-bold">{angle}°</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {individualRotations.map((angle, idx) => (
                  <div key={idx} className="relative group p-4 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all">
                    <div className="flex flex-col items-center gap-3">
                      <div 
                        className="relative w-24 h-32 bg-secondary/30 rounded-lg shadow-md flex items-center justify-center overflow-hidden border border-border/50 transition-transform duration-500"
                        style={{ transform: `rotate(${angle}deg)` }}
                      >
                        {/* Blurred Background */}
                        {previews[idx] && (
                          <div className="absolute inset-[-100%] z-0 pointer-events-none">
                            <img 
                              src={previews[idx]} 
                              alt="" 
                              className="w-full h-full object-cover blur-3xl opacity-30"
                              style={{ transform: 'scale(1.5)' }}
                            />
                          </div>
                        )}
                        {previews[idx] ? (
                          <img 
                            src={previews[idx]} 
                            alt={`page ${idx + 1}`} 
                            className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                          />
                        ) : (
                          <FileText 
                            className="relative z-10 text-zinc-400 dark:text-zinc-500" 
                            size={32} 
                          />
                        )}
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">Sayfa {idx + 1}</span>
                      <span className="text-xs font-bold text-primary mb-1">{((angle % 360) + 360) % 360}°</span>
                      
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            const newRots = [...individualRotations];
                            newRots[idx] = newRots[idx] + 90;
                            setIndividualRotations(newRots);
                          }}
                          className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                          title="Saat Yönünde Döndür (+90)"
                        >
                          <RotateCw size={15} />
                        </button>
                        <button
                          onClick={() => {
                            const newRots = [...individualRotations];
                            newRots[idx] = newRots[idx] - 90;
                            setIndividualRotations(newRots);
                          }}
                          className="p-2 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                          title="Saat Yönü Tersi Döndür (-90)"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => {
                            const newRots = [...individualRotations];
                            newRots[idx] = 0;
                            setIndividualRotations(newRots);
                          }}
                          className="p-2 rounded-xl bg-secondary text-muted-foreground hover:bg-destructive hover:text-white transition-all shadow-sm"
                          title="Sıfırla"
                        >
                          <RotateCcw size={15} className="rotate-180" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={isProcessing || (rotationMode === 'all' && rotation === 0 && individualRotations.every(r => r === 0))}
            onClick={rotatePDF}
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg",
              !isProcessing
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
                <RotateCw size={20} />
                Döndür ve İndir
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
