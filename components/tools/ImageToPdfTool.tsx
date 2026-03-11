'use client';

// Updated v2

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUpload from '../FileUpload';
import { Image as ImageIcon, Loader2, Download, Trash2, GripVertical, FileText, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, Reorder } from 'framer-motion';

export default function ImageToPdfTool() {
  const [images, setImages] = useState<{ id: string, file: File, preview: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingImages, setIsAddingImages] = useState(false);

  const handleFilesSelected = async (newFiles: File[]) => {
    setIsAddingImages(true);
    // Use a small timeout to allow UI to show loading state
    await new Promise(resolve => setTimeout(resolve, 100));

    const newImages = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
    setIsAddingImages(false);
  };

  const removeImage = (id: string, preview: string) => {
    URL.revokeObjectURL(preview);
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    
    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[newIndex];
    newImages[newIndex] = temp;
    setImages(newImages);
  };

  const downloadSingleAsPdf = async (imageObj: { file: File }) => {
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const imageBytes = await imageObj.file.arrayBuffer();
      let embeddedImage;
      
      if (imageObj.file.type === 'image/jpeg' || imageObj.file.type === 'image/jpg') {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } else if (imageObj.file.type === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        throw new Error('Desteklenmeyen format');
      }

      const { width, height } = embeddedImage.scale(1);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, { x: 0, y: 0, width, height });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${imageObj.file.name.split('.')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error:', error);
      alert('PDF oluşturulurken hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const convertAllToPdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const imageObj of images) {
        const imageBytes = await imageObj.file.arrayBuffer();
        let embeddedImage;
        
        if (imageObj.file.type === 'image/jpeg' || imageObj.file.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else if (imageObj.file.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          continue; 
        }

        const { width, height } = embeddedImage.scale(1);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tum_gorseller.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Conversion error:', error);
      alert('PDF oluşturma sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Görselden PDF'e</h2>
        <p className="text-muted-foreground mt-2">
          JPG veya PNG görsellerini tek tek veya birleştirerek PDF formatına dönüştürün.
        </p>
      </div>

      <div className="relative">
        <FileUpload 
          onFilesSelected={handleFilesSelected} 
          accept="image/png, image/jpeg" 
          label="Görselleri buraya sürükleyin (JPG, PNG)"
        />

        {(isAddingImages || isProcessing) && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm rounded-3xl border border-primary/20 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary shadow-xl shadow-primary/10">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <p className="font-bold text-lg text-primary animate-pulse">
              {isAddingImages ? "Görseller işleniyor..." : "PDF oluşturuluyor..."}
            </p>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Görsel Listesi ({images.length})</h3>
            <button 
              onClick={() => {
                images.forEach(img => URL.revokeObjectURL(img.preview));
                setImages([]);
              }}
              className="text-sm text-destructive hover:underline flex items-center gap-1"
            >
              <Trash2 size={14} /> Tümünü Temizle
            </button>
          </div>
          
          <Reorder.Group 
            axis="y" 
            values={images} 
            onReorder={setImages}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {images.map((img, index) => (
              <Reorder.Item
                key={img.id}
                value={img}
                className={cn(
                  "relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden group transition-all duration-300",
                  "hover:shadow-xl hover:border-primary/50"
                )}
              >
                {/* Image Preview */}
                <div className="aspect-video relative overflow-hidden bg-secondary/30">
                  <img 
                    src={img.preview} 
                    alt={img.file.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Reorder Arrows & Delete Top Right */}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => moveImage(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-primary disabled:opacity-30 disabled:hover:bg-black/60"
                      title="Sola Taşı"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <button
                      onClick={() => moveImage(index, 'down')}
                      disabled={index === images.length - 1}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-primary disabled:opacity-30 disabled:hover:bg-black/60"
                      title="Sağa Taşı"
                    >
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={() => removeImage(img.id, img.preview)}
                      className="p-1.5 rounded-lg bg-destructive text-white hover:bg-destructive/80"
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Info & Actions */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-primary shrink-0" />
                    <p className="text-sm font-semibold truncate flex-1">{img.file.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground uppercase font-bold">
                      {img.file.type.split('/')[1]}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadSingleAsPdf(img)}
                      className="flex-1 h-9 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      title="Sadece bu görseli indir"
                    >
                      <Download size={14} /> PDF İndir
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="pt-8">
            <button
              disabled={isProcessing}
              onClick={convertAllToPdf}
              className={cn(
                "w-full h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl bg-primary text-primary-foreground shadow-primary/20",
                "hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <FileText size={24} />
                  Tümünü Birleştir ve PDF Yap
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
