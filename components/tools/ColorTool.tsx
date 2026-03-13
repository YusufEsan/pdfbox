"use client";

import React, { useState } from 'react';
import { Palette, Copy, Check, Download, Loader2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import FileUpload from '../FileUpload';
import { Badge } from '../ui/badge';

// PDF.js worker ayarı
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ColorInfo {
    hex: string;
    rgb: string;
    percentage: number;
}

const ColorTool = () => {
    const [colors, setColors] = useState<ColorInfo[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const { toast } = useToast();

    const handleFilesSelected = async (files: File[]) => {
        if (files.length === 0) return;
        
        setIsAnalyzing(true);
        setColors([]);

        try {
            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            
            // İlk 3 sayfayı analiz et (Performans için)
            const numPages = Math.min(pdf.numPages, 3);
            const colorMap = new Map<string, number>();
            let totalPixels = 0;

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 }); // Daha hızlı analiz için düşük ölçek
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { willReadFrequently: true });
                
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ 
                    canvasContext: context, 
                    viewport,
                    canvas: canvas // PDF.js v5+ için gerekli olabilir
                }).promise;

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                for (let j = 0; j < data.length; j += 16) { // Her 4. pikseli kontrol et (Daha hızlı)
                    const r = data[j];
                    const g = data[j + 1];
                    const b = data[j + 2];
                    const a = data[j + 3];

                    // Şeffaf veya beyaza çok yakın pikselleri atla
                    if (a < 128 || (r > 245 && g > 245 && b > 245)) continue;

                    const hex = rgbToHex(r, g, b);
                    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
                    totalPixels++;
                }
            }

            // En baskın 10 rengi al
            const sortedColors = Array.from(colorMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([hex, count]) => ({
                    hex,
                    rgb: hexToRgb(hex),
                    percentage: (count / totalPixels) * 100
                }));

            setColors(sortedColors);
        } catch (error) {
            console.error("Renk analizi hatası:", error);
            toast({
                title: "Hata",
                description: "Renk paleti çıkarılırken bir problem oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const rgbToHex = (r: number, g: number, b: number) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    };

    const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${r}, ${g}, ${b})`;
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        toast({
            title: "Kopyalandı",
            description: `${text} panoya kopyalandı.`
        });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Renk Paleti Çıkarıcı</h2>
                <p className="text-muted-foreground mt-2">
                    PDF belgenizdeki baskın renkleri analiz edin ve tasarımınız için bir palet oluşturun.
                </p>
            </div>

            <FileUpload 
                onFilesSelected={handleFilesSelected} 
                multiple={false} 
                label="Renk paleti çıkarılacak PDF dosyasını seçin" 
            />

            {isAnalyzing && (
                <div className="flex flex-col items-center justify-center p-12 gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-muted-foreground animate-pulse">Renkler analiz ediliyor...</p>
                </div>
            )}

            {colors.length > 0 && !isAnalyzing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Palette className="w-5 h-5 text-rose-500" />
                            Baskın Renkler
                        </h3>
                        <div className="space-y-4">
                            {colors.map((color, index) => (
                                <div key={index} className="flex items-center gap-4 group">
                                    <div 
                                        className="w-12 h-12 rounded-lg shadow-sm border"
                                        style={{ backgroundColor: color.hex }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono font-medium">{color.hex}</span>
                                            <span className="text-xs text-muted-foreground">{color.percentage.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary transition-all duration-1000"
                                                style={{ width: `${color.percentage}%`, backgroundColor: color.hex }}
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => copyToClipboard(color.hex, index)}
                                    >
                                        {copiedIndex === index ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6 bg-muted/30">
                        <h3 className="text-lg font-semibold mb-4">Palet Görünümü</h3>
                        <div className="flex h-40 rounded-xl overflow-hidden shadow-inner border">
                            {colors.map((color, index) => (
                                <div 
                                    key={index}
                                    className="flex-1 h-full hover:flex-[1.5] transition-all duration-300 relative group cursor-pointer"
                                    style={{ backgroundColor: color.hex }}
                                    onClick={() => copyToClipboard(color.hex, index)}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 text-white font-mono text-[10px] rotate-90 sm:rotate-0">
                                        {color.hex}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-8 space-y-4">
                            <p className="text-sm text-muted-foreground italic">
                                * Bu renkler belgenizin ilk birkaç sayfasındaki görseller, başlıklar ve grafikler analiz edilerek elde edilmiştir.
                            </p>
                            <Button className="w-full border-rose-200 hover:bg-rose-50 hover:text-rose-600" variant="outline">
                                <Download className="w-4 h-4 mr-2" /> Renkleri .ASE Olarak İndir (Yakında)
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ColorTool;
