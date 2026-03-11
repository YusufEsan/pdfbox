'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileStack, 
  FileMinus, 
  Type, 
  Settings2,
  Github,
  Moon,
  Sun,
  RotateCw,
  Scissors,
  Image
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './ThemeProvider';

const tools = [
  {
    id: 'merge',
    name: 'PDF Birleştirme',
    description: 'Birden fazla PDF dosyasını tek bir dosyada birleştirin.',
    icon: FileStack,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'delete',
    name: 'Sayfa Silme',
    description: 'PDF dosyanızdan gereksiz sayfaları çıkartın.',
    icon: FileMinus,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    id: 'watermark',
    name: 'Filigran Ekle',
    description: 'PDF sayfalarınıza metin tabanlı filigran ekleyin.',
    icon: Type,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    id: 'rotate',
    name: 'PDF Döndür',
    description: 'PDF sayfalarını 90, 180 veya 270 derece döndürün.',
    icon: RotateCw,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    id: 'split',
    name: 'PDF Böl',
    description: 'PDF sayfalarını yeni belgelere bölün.',
    icon: Scissors,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'image-to-pdf',
    name: 'Görselden PDF\'e',
    description: 'Fotoğrafları PDF formatına dönüştürün.',
    icon: Image,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
];

export default function Sidebar({ 
  activeTool, 
  setActiveTool 
}: { 
  activeTool: string; 
  setActiveTool: (id: string) => void;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex h-screen w-72 flex-col border-r border-border bg-card/50 backdrop-blur-xl">
      <div className="flex h-16 items-center border-b border-border px-6 justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Settings2 size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">PDF Araçları</span>
        </div>
        
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Temayı Değiştir"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 outline-none text-left",
              activeTool === tool.id 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title={tool.description}
          >
            <tool.icon 
              className={cn(
                "h-5 w-5 shrink-0 transition-colors",
                activeTool === tool.id ? "text-primary-foreground" : tool.color
              )} 
            />
            <span className="truncate">{tool.name}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-border">
        <div className="rounded-2xl bg-secondary/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Açık Kaynak</p>
          <a 
            href="https://github.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold hover:underline"
          >
            <Github size={16} />
            GitHub'da Görüntüle
          </a>
        </div>
      </div>
    </div>
  );
}
