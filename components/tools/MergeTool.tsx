'use client';

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, X, GripVertical, Loader2, Download, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Her dosya için benzersiz bir id oluşturarak framer-motion sürükle-bırak animasyonlarının
// index bağımsız, tamamen akıcı çalışmasını sağlıyoruz.
interface FileItem {
  id: string;
  file: File;
}

export default function MergeTool() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (newFiles: File[]) => {
    const newItems = newFiles.map(file => ({
      id: crypto.randomUUID(),
      file
    }));
    setFiles((prev) => [...prev, ...newItems]);
  };

  const removeFile = (idToRemove: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const moveFile = (currentIndex: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= files.length) return;
    const newFiles = [...files];
    const [movedItem] = newFiles.splice(currentIndex, 1);
    newFiles.splice(newIndex, 0, movedItem);
    setFiles(newFiles);
  };

  const mergePDFs = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'birlesmis_dosya.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Merge error:', error);
      alert('PDF birleştirme sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">PDF Birleştir</h2>
        <p className="text-muted-foreground mt-2">
          Birden fazla PDF dosyasını seçin ve dilediğiniz sırayla tek bir dosyada birleştirin.
        </p>
      </div>

      <FileUpload onFilesSelected={handleFilesSelected} label="Birleştirilecek PDF dosyalarını seçin" />

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold">Dosya Listesi ({files.length})</h3>
            <button 
              onClick={() => setFiles([])}
              className="text-sm text-destructive hover:underline flex items-center gap-1"
            >
              <Trash2 size={14} /> Temizle
            </button>
          </div>
          
          <Reorder.Group 
            axis="y" 
            values={files} 
            onReorder={setFiles}
            className="space-y-4"
          >
            <AnimatePresence initial={false}>
              {files.map((item, index) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
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
                    "relative cursor-grab active:cursor-grabbing bg-card hover:bg-secondary/30 transition-shadow duration-200",
                    "flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-border group"
                  )}
                >
                  <GripVertical className="text-muted-foreground shrink-0 hidden sm:block opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>

                  {/* Arrow buttons */}
                  <div className="flex items-center gap-1 shrink-0 z-10 cursor-default">
                    <button
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveFile(index, 'up');
                      }}
                      className="p-1.5 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-lg disabled:opacity-30 transition-all border border-border/50"
                      title="Yukarı Taşı"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      disabled={index === files.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveFile(index, 'down');
                      }}
                      className="p-1.5 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-lg disabled:opacity-30 transition-all border border-border/50"
                      title="Aşağı Taşı"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFile(item.id)}
                    className="p-1.5 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0 z-10 cursor-default"
                  >
                    <X size={16} />
                  </button>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <div className="pt-6">
            <button
              disabled={files.length < 2 || isProcessing}
              onClick={mergePDFs}
              className={cn(
                "w-full h-12 sm:h-14 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all",
                files.length >= 2 
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
                  PDF'leri Birleştir ve İndir
                </>
              )}
            </button>
            {files.length < 2 && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                Birleştirmek için en az 2 dosya seçmelisiniz.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
