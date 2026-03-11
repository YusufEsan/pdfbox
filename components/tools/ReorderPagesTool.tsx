'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { 
  GripVertical, 
  Download, 
  Loader2, 
  FileText, 
  X,
  Type,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  Settings2
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import FileUpload from '../FileUpload';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PageItem {
  id: string; // Unique ID for Reorder.Item
  index: number; // Original page index (1-based)
  thumbnail: string;
}

export default function ReorderPagesTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileSelected = (files: File[]) => {
    setFile(files[0]);
    setPages([]);
    setIsDone(false);
  };

  const loadThumbnails = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const loadedPages: PageItem[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 }); // Low scale for thumbnails
        
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
          id: `page-${i}-${Math.random().toString(36).substr(2, 9)}`,
          index: i,
          thumbnail: canvas.toDataURL('image/jpeg', 0.8)
        });
      }

      setPages(loadedPages);
      setIsDone(true);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('PDF yüklenirken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (file && !isDone && !isProcessing) {
      loadThumbnails();
    }
  }, [file]);

  const saveReorderedPdf = async () => {
    if (!file || pages.length === 0) return;
    setIsSaving(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalDoc = await PDFDocument.load(arrayBuffer);
      const newDoc = await PDFDocument.create();

      // Copy pages in the new order
      for (const item of pages) {
        const [copiedPage] = await newDoc.copyPages(originalDoc, [item.index - 1]);
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reordered_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert('PDF kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const movePage = (currentIndex: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const newPages = [...pages];
    const [movedItem] = newPages.splice(currentIndex, 1);
    newPages.splice(newIndex, 0, movedItem);
    setPages(newPages);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Sayfa Sıralama</h1>
        <p className="text-muted-foreground">
          PDF sayfalarınızı sürükleyip bırakarak istediğiniz sıraya koyun.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} accept=".pdf" multiple={false} />
      ) : (
        <div className="space-y-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="font-bold truncate max-w-[150px] sm:max-w-xs">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB • {pages.length} Sayfa</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isDone && (
                  <>
                    <button 
                      onClick={() => {
                        setFile(null);
                        setPages([]);
                        setIsDone(false);
                      }}
                      className="h-10 px-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-xs font-bold transition-all border border-border/50 flex items-center gap-2"
                      title="Yeni Dosya"
                    >
                      <X className="rotate-45" size={16} />
                      Yeni
                    </button>

                    <button
                      disabled={isSaving}
                      onClick={saveReorderedPdf}
                      className="h-10 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                      PDF Olarak Kaydet
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {isProcessing ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 bg-card/30 border border-border border-dashed rounded-3xl">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="h-12 w-12 text-primary animate-spin relative z-10" />
              </div>
              <p className="text-lg font-medium text-muted-foreground animate-pulse">Sayfalar hazırlanıyor...</p>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={pages} 
              onReorder={setPages}
              className="space-y-4"
            >
              <AnimatePresence initial={false}>
                {pages.map((page, index) => (
                  <Reorder.Item 
                    key={page.id} 
                    value={page}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    whileDrag={{ 
                      scale: 1.01, 
                      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                      zIndex: 50
                    }}
                    className={cn(
                      "relative cursor-grab active:cursor-grabbing bg-card hover:bg-secondary/30 border border-border p-4 rounded-2xl flex items-center gap-6 group transition-shadow duration-200",
                      page.index !== index + 1 && "border-l-4 border-l-orange-500 shadow-md ring-1 ring-orange-500/20"
                    )}
                  >
                    {page.index !== index + 1 && (
                      <div className="absolute top-0 right-10 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-20">
                        DEĞİŞTİRİLDİ
                      </div>
                    )}
                    <div className="flex items-center gap-4 min-w-[60px] justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <span className="text-xl font-black italic opacity-20 group-hover:opacity-100 transition-opacity">
                        {index + 1}
                      </span>
                      <GripVertical size={20} className="shrink-0" />
                    </div>

                    <div className="h-24 w-16 bg-muted rounded-lg overflow-hidden border border-border/50 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                      <img 
                        src={page.thumbnail} 
                        alt={`Sayfa ${page.index}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg">Orijinal Sayfa {page.index}</h3>
                      <p className="text-sm text-muted-foreground">PDF içindeki orijinal konumu: {page.index}</p>
                    </div>

                    <div className="flex items-center gap-2">
                       <button
                         disabled={index === 0}
                         onClick={(e) => {
                           e.stopPropagation();
                           movePage(index, 'up');
                         }}
                         className="p-2 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-xl disabled:opacity-30 disabled:hover:bg-secondary disabled:hover:text-muted-foreground transition-all border border-border/50"
                         title="Yukarı Taşı"
                       >
                         <ChevronUp size={18} />
                       </button>
                       <button
                         disabled={index === pages.length - 1}
                         onClick={(e) => {
                           e.stopPropagation();
                           movePage(index, 'down');
                         }}
                         className="p-2 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-xl disabled:opacity-30 disabled:hover:bg-secondary disabled:hover:text-muted-foreground transition-all border border-border/50"
                         title="Aşağı Taşı"
                       >
                         <ChevronDown size={18} />
                       </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-muted-foreground text-xs font-medium bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
                      <ArrowRightLeft size={14} />
                      Yeri değiştirilebilir
                    </div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>
      )}
    </div>
  );
}
