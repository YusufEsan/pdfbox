'use client';

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, X, GripVertical, Loader2, Download, Trash2 } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MergeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const mergePDFs = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
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
        <h2 className="text-3xl font-bold tracking-tight">PDF Birleştir</h2>
        <p className="text-muted-foreground mt-2">
          Birden fazla PDF dosyasını seçin ve dilediğiniz sırayla tek bir dosyada birleştirin.
        </p>
      </div>

      <FileUpload onFilesSelected={handleFilesSelected} label="Birleştirilecek PDF dosyalarını seçin" />

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Dosya Listesi ({files.length})</h3>
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
            className="space-y-2"
          >
            {files.map((file, index) => (
              <Reorder.Item
                key={`${file.name}-${index}`}
                value={file}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border border-border bg-card transition-all group",
                  "hover:shadow-md hover:border-primary/50"
                )}
              >
                <GripVertical className="text-muted-foreground cursor-grab active:cursor-grabbing" size={20} />
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={18} />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="pt-6">
            <button
              disabled={files.length < 2 || isProcessing}
              onClick={mergePDFs}
              className={cn(
                "w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
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
