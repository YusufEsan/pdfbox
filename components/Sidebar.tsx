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
  ImageIcon,
  Lock,
  ArrowRightLeft,
  Menu,
  X,
  Hash,
  Tags,
  PackageOpen,
  FileArchive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './ThemeProvider';
import { AnimatePresence, motion } from 'framer-motion';

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
    icon: ImageIcon,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    id: 'protect',
    name: 'PDF Şifreleme',
    description: 'PDF dosyalarınıza parola koyarak güvenliğini sağlayın.',
    icon: Lock,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  {
    id: 'pdf-to-img',
    name: 'PDF\'den Görsele',
    description: 'PDF sayfalarını yüksek kaliteli görsellere dönüştürün.',
    icon: ImageIcon,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'reorder',
    name: 'Sayfa Sıralama',
    description: 'PDF sayfalarının sırasını sürükle-bırak ile değiştirin.',
    icon: ArrowRightLeft,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'page-numbers',
    name: 'Sayfa Numarası',
    description: 'PDF sayfalarının kenarlarına numara ekleyin.',
    icon: Hash,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  {
    id: 'metadata',
    name: 'Metadata Düzenle',
    description: 'PDF detaylarını (Başlık, yazar, konu vb.) düzenleyin.',
    icon: Tags,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  {
    id: 'extract-images',
    name: 'Görselleri Ayıkla',
    description: 'PDF içindeki gömülü görselleri tek tıkla cihazınıza indirin.',
    icon: PackageOpen,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    id: 'compress',
    name: 'PDF Sıkıştır',
    description: 'PDF boyutunu kaliteden fazla ödün vermeden küçültün.',
    icon: FileArchive,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToolSelect = (id: string) => {
    setActiveTool(id);
    setIsOpen(false); // Close mobile menu on selection
  };

  const activeToolData = tools.find(t => t.id === activeTool);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center border-b border-border px-6 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Settings2 size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">PDF Araçları</span>
        </div>
        
        <div className="flex items-center gap-1">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Temayı Değiştir"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}
          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
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

      <div className="p-4 mt-auto border-t border-border shrink-0">
        <div className="rounded-2xl bg-secondary/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Açık Kaynak</p>
          <a 
            href="https://github.com/YusufEsan/pdfbox" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold hover:underline"
          >
            <Github size={16} />
            GitHub'da Görüntüle
          </a>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Settings2 size={16} />
          </div>
          <span className="text-base font-bold tracking-tight">PDF Araçları</span>
        </div>

        <div className="flex items-center gap-1">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] z-50 bg-card/95 backdrop-blur-xl border-r border-border flex flex-col shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-screen w-72 flex-col border-r border-border bg-card/50 backdrop-blur-xl shrink-0">
        {sidebarContent}
      </div>
    </>
  );
}
