'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Sayfa scroll durumunu kontrol et
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const toggleVisibility = () => {
      // 300px'den fazla kaydırıldıysa butonu göster
      if (mainElement.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    mainElement.addEventListener('scroll', toggleVisibility);

    return () => mainElement.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className={cn(
            "fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50",
            "p-3 lg:p-4 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30",
            "hover:scale-110 active:scale-90 transition-transform focus:outline-none"
          )}
          aria-label="En üste çık"
        >
          <ArrowUp size={24} className="sm:hidden" />
          <ArrowUp size={28} className="hidden sm:block" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
