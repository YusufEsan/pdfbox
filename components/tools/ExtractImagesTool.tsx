'use client';

import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { 
  ImageIcon, 
  Download, 
  Loader2, 
  Trash2,
  CheckCircle2,
  Layers,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUpload from '../FileUpload';
import JSZip from 'jszip';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ExtractedImage {
  id: string; // unique
  page: number;
  dataUrl: string;
  width: number;
  height: number;
}

export default function ExtractImagesTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<string>>(new Set());

  const handleFileSelected = (files: File[]) => {
    setFile(files[0]);
    setImages([]);
    setIsDone(false);
    setSelectedIndices(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIndices(newSelection);
  };

  const selectAll = () => {
    if (selectedIndices.size === images.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(images.map(img => img.id)));
    }
  };

  const extractImages = async () => {
    if (!file) return;
    setIsProcessing(true);
    setSelectedIndices(new Set());
    setImages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const extractedImages: ExtractedImage[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const ops = await page.getOperatorList();
        
        let imgIndexInPage = 0;

        for (let j = 0; j < ops.fnArray.length; j++) {
          const fn = ops.fnArray[j];
          if (
            fn === pdfjs.OPS.paintImageXObject || 
            fn === (pdfjs.OPS as any).paintJpegXObject || 
            fn === (pdfjs.OPS as any).paintInlineImageXObject
          ) {
            const imgKey = ops.argsArray[j][0];
            try {
              const imgObj: any = await new Promise((resolve, reject) => {
                try {
                  page.objs.get(imgKey, (data: any) => resolve(data));
                } catch(e) { 
                  reject(e); 
                }
              });

              if (imgObj) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                if (imgObj.bitmap) {
                  // Modern browsers return ImageBitmap
                  canvas.width = imgObj.bitmap.width;
                  canvas.height = imgObj.bitmap.height;
                  ctx.drawImage(imgObj.bitmap, 0, 0);
                  
                  extractedImages.push({
                    id: `p${i}-${imgIndexInPage}`,
                    page: i,
                    dataUrl: canvas.toDataURL('image/png', 1.0),
                    width: imgObj.bitmap.width,
                    height: imgObj.bitmap.height
                  });
                  imgIndexInPage++;
                } else if (imgObj.data) {
                  // Fallback: raw pixel data
                  canvas.width = imgObj.width;
                  canvas.height = imgObj.height;
                  // Handle different color spaces or just standard RGBA
                  let imgData;
                  if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
                     imgData = new ImageData(imgObj.data, imgObj.width, imgObj.height);
                  } else {
                     // Try to properly format if it's RGB without alpha
                     const rgba = new Uint8ClampedArray(imgObj.width * imgObj.height * 4);
                     let dataIdx = 0;
                     const isRGB = imgObj.data.length === imgObj.width * imgObj.height * 3;
                     
                     if (isRGB) {
                       for (let k = 0; k < imgObj.data.length; k += 3) {
                         rgba[dataIdx++] = imgObj.data[k];
                         rgba[dataIdx++] = imgObj.data[k + 1];
                         rgba[dataIdx++] = imgObj.data[k + 2];
                         rgba[dataIdx++] = 255;
                       }
                     } else {
                        // other generic mapping (just copy over what we can) 
                        for (let k = 0; k < imgObj.data.length; k++) {
                          rgba[k] = imgObj.data[k];
                        }
                     }
                     imgData = new ImageData(rgba, imgObj.width, imgObj.height);
                  }

                  ctx.putImageData(imgData, 0, 0);
                  extractedImages.push({
                    id: `p${i}-${imgIndexInPage}`,
                    page: i,
                    dataUrl: canvas.toDataURL('image/png', 1.0),
                    width: imgObj.width,
                    height: imgObj.height
                  });
                  imgIndexInPage++;
                }
              }
            } catch (err) {
              console.warn(`Sayfa ${i} içerisindeki bir görsel atlandı:`, err);
            }
          }
        }
      }

      setImages(extractedImages);
      setIsDone(true);
    } catch (error) {
      console.error('Extraction error:', error);
      alert('İşlem sırasında bir hata oluştu veya PDF bozuk/şifreli olabilir.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSelectedAsZip = async () => {
    if (selectedIndices.size === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const imgs = zip.folder("pdf_gorselleri");
      
      const imagesToZip = images.filter(img => selectedIndices.has(img.id));

      imagesToZip.forEach((img, idx) => {
        // Strip out the data url prefix
        const base64Data = img.dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
        imgs?.file(`Gorsel_S${img.page}_${idx + 1}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      downloadImage(url, `${file?.name.replace('.pdf', '')}_gorseller.zip`);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Zip creation failed:', error);
      alert('ZIP dosyası oluşturulurken hata oluştu.');
    } finally {
      setIsZipping(false);
    }
  };

  const downloadAllAsZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const imgs = zip.folder("pdf_gorselleri");

      images.forEach((img, idx) => {
        const base64Data = img.dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
        imgs?.file(`Gorsel_S${img.page}_${idx + 1}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      downloadImage(url, `${file?.name.replace('.pdf', '')}_tum_gorseller.zip`);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Zip creation failed:', error);
      alert('ZIP dosyası oluşturulurken hata oluştu.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Görselleri Ayıkla</h2>
        <p className="text-muted-foreground mt-2">
          PDF belgenizin içine gömülü olan tüm görsel ve fotoğrafları orijinal kaliteyle çıkarıp indirin.
        </p>
      </div>

      {!file ? (
        <FileUpload onFilesSelected={handleFileSelected} multiple={false} label="Görselleri ayıklanacak PDF'i seçin" />
      ) : (
        <div className="space-y-6">
          {/* File Header */}
          <div className="p-4 sm:p-6 rounded-3xl border border-border bg-card flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-[200px]">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <ImageIcon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-base sm:text-lg">{file.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setFile(null);
                setImages([]);
                setSelectedIndices(new Set());
              }}
              className="text-xs sm:text-sm text-destructive hover:underline shrink-0 flex items-center gap-1 px-2 py-1 bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} /> Tümü İptal
            </button>
          </div>

          {!isDone && (
            <button
              disabled={isProcessing}
              onClick={extractImages}
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
                  PDF Taranıyor...
                </>
              ) : (
                <>
                  <Layers size={20} />
                  Görselleri Tara ve Ayıkla
                </>
              )}
            </button>
          )}

          {isDone && images.length === 0 && (
            <div className="p-6 rounded-3xl border border-border border-dashed bg-card/50 text-center text-muted-foreground">
              <p>Bu PDF dosyasında herhangi bir görünür görsel bulunamadı.</p>
            </div>
          )}

          {isDone && images.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-secondary/50 border border-border">
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                      selectedIndices.size === images.length ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                    )}>
                      {selectedIndices.size === images.length && <CheckCircle2 size={14} />}
                    </div>
                    Tümünü Seç
                  </button>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({selectedIndices.size}/{images.length} seçili)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedIndices.size > 0 ? (
                    <button
                      disabled={isZipping}
                      onClick={downloadSelectedAsZip}
                      className="px-4 py-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 hover:text-white dark:hover:text-black border border-border bg-card rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                      {isZipping ? <Loader2 className="animate-spin" size={16} /> : <Archive size={16} />}
                      Seçilenleri İndir (.zip)
                    </button>
                  ) : null}
                  <button
                    disabled={isZipping}
                    onClick={downloadAllAsZip}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isZipping ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                    Tümünü İndir (.zip)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((img) => {
                  const isSelected = selectedIndices.has(img.id);
                  return (
                    <div 
                      key={img.id}
                      onClick={() => toggleSelection(img.id)}
                      className={cn(
                        "group relative aspect-square rounded-2xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md bg-secondary/30",
                        isSelected ? "border-primary shadow-sm shadow-primary/10" : "border-transparent"
                      )}
                    >
                      <div className="absolute inset-0 p-2 pointer-events-none">
                        <div className="w-full h-full relative rounded-xl overflow-hidden bg-white">
                           <img 
                             src={img.dataUrl} 
                             alt={`Sayfa ${img.page} Görseli`} 
                             className="absolute object-contain w-full h-full"
                           />
                        </div>
                      </div>

                      {/* Overlays */}
                      <div className={cn(
                        "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}>
                        <div className="flex gap-2">
                          <button 
                            className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(img.dataUrl, `Gorsel_S${img.page}_${img.id}.png`);
                            }}
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Selection Checkbox */}
                      <div className="absolute top-3 left-3 w-6 h-6 rounded-md bg-background/80 backdrop-blur-md shadow-sm border border-border flex items-center justify-center pointer-events-none">
                        <div className={cn(
                          "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <CheckCircle2 size={12} />}
                        </div>
                      </div>

                      {/* Resolution Badge */}
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-md shadow-sm border border-border text-[10px] font-bold pointer-events-none text-muted-foreground">
                        {img.width}x{img.height}
                      </div>

                      {/* Page Info */}
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-md shadow-sm border border-border text-[10px] font-bold pointer-events-none text-muted-foreground">
                        S: {img.page}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
