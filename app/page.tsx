'use client';

import React, { useState } from 'react';
// Tools
import Sidebar from '../components/Sidebar';
import dynamic from 'next/dynamic';

const MergeTool = dynamic(() => import('../components/tools/MergeTool'), { ssr: false });
const DeleteTool = dynamic(() => import('../components/tools/DeleteTool'), { ssr: false });
const WatermarkTool = dynamic(() => import('../components/tools/WatermarkTool'), { ssr: false });
const RotateTool = dynamic(() => import('../components/tools/RotateTool'), { ssr: false });
const SplitTool = dynamic(() => import('../components/tools/SplitTool'), { ssr: false });
const ImageToPdfTool = dynamic(() => import('../components/tools/ImageToPdfTool'), { ssr: false });
const ProtectTool = dynamic(() => import('../components/tools/ProtectTool'), { ssr: false });
const PdfToImgTool = dynamic(() => import('../components/tools/PdfToImgTool'), { ssr: false });
const ReorderTool = dynamic(() => import('../components/tools/ReorderPagesTool'), { ssr: false });

import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [activeTool, setActiveTool] = useState('merge');

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      
      <main className="flex-1 overflow-y-auto relative pt-14 lg:pt-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTool === 'merge' && <MergeTool />}
              {activeTool === 'delete' && <DeleteTool />}
              {activeTool === 'watermark' && <WatermarkTool />}
              {activeTool === 'rotate' && <RotateTool />}
              {activeTool === 'split' && <SplitTool />}
              {activeTool === 'image-to-pdf' && <ImageToPdfTool />}
              {activeTool === 'protect' && <ProtectTool />}
              {activeTool === 'pdf-to-img' && <PdfToImgTool />}
              {activeTool === 'reorder' && <ReorderTool />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
