'use client';

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { FileText, Loader2, Download, Trash2, Tags, User, AlignLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Metadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

export default function MetadataTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [metadata, setMetadata] = useState<Metadata>({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: ''
  });

  const handleFileSelected = async (files: File[]) => {
    const selectedFile = files[0];
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      
      // Extract existing metadata
      setMetadata({
        title: pdf.getTitle() || '',
        author: pdf.getAuthor() || '',
        subject: pdf.getSubject() || '',
        keywords: pdf.getKeywords() || '',
        creator: pdf.getCreator() || '',
        producer: pdf.getProducer() || ''
      });
      
      setFile(selectedFile);
    } catch (error) {
      console.error('Error loading PDF metadata:', error);
      alert('PDF yüklenirken veya veriler okunurken bir hata oluştu. Lütfen şifresiz bir PDF deneyin.');
    }
  };

  const processPDF = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Update metadata
      pdfDoc.setTitle(metadata.title);
      pdfDoc.setAuthor(metadata.author);
      pdfDoc.setSubject(metadata.subject);
      pdfDoc.setKeywords([metadata.keywords]); // setKeywords takes an array in some versions, or join by comma. Let's just pass array of 1 string, or split it.
      pdfDoc.setCreator(metadata.creator);
      pdfDoc.setProducer(metadata.producer);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `meta_guncel_${file.name}`;
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

  const handleInputChange = (field: keyof Metadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Metadata Düzenleyici</h2>
        <p className="text-muted-foreground mt-2">
          PDF dosyanızın başlık, yazar ve konu gibi gizli meta özelliklerini okuyun ve düzenleyin.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Bilgileri düzenlenecek PDF'i seçin" />
      ) : (
        <div className="space-y-6">
          <div className="p-4 sm:p-6 rounded-3xl border border-border bg-card flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Tags size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-base sm:text-lg">{file.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={() => {
                setFile(null);
                setMetadata({ title: '', author: '', subject: '', keywords: '', creator: '', producer: '' });
              }}
              className="text-xs sm:text-sm text-destructive hover:underline shrink-0 flex items-center gap-1"
            >
              <Trash2 size={14} /> Temizle
            </button>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Info size={20} className="text-primary" />
              Dosya Bilgileri (Metadata)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">
                  Başlık (Title)
                </label>
                <input 
                  type="text"
                  value={metadata.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Belge başlığını girin..."
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">
                  Yazar (Author)
                </label>
                <input 
                  type="text"
                  value={metadata.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="Yazar adını girin..."
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">
                  Konu (Subject)
                </label>
                <input 
                  type="text"
                  value={metadata.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Belgenin konusunu girin..."
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">
                  Anahtar Kelimeler (Keywords)
                </label>
                <input 
                  type="text"
                  value={metadata.keywords}
                  onChange={(e) => handleInputChange('keywords', e.target.value)}
                  placeholder="Virgülle ayırarak girin..."
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">
                  Oluşturan Yazılım (Creator)
                </label>
                <input 
                  type="text"
                  value={metadata.creator}
                  onChange={(e) => handleInputChange('creator', e.target.value)}
                  placeholder="Örn: Microsoft Word..."
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">
                  PDF Üretici (Producer)
                </label>
                <input 
                  type="text"
                  value={metadata.producer}
                  onChange={(e) => handleInputChange('producer', e.target.value)}
                  placeholder="Örn: macOS Version 14.1..."
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>

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
                Bilgileri Güncelle ve İndir
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
