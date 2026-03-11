'use client';

import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';
import FileUpload from '../FileUpload';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Download, 
  ShieldAlert,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProtectTool() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [strength, setStrength] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Basic password strength logic
    let s = 0;
    if (password.length > 5) s += 1;
    if (password.length > 10) s += 1;
    if (/[A-Z]/.test(password)) s += 1;
    if (/[0-9]/.test(password)) s += 1;
    if (/[^A-Za-z0-9]/.test(password)) s += 1;
    setStrength(s);
  }, [password]);

  const handleFileSelected = (files: File[]) => {
    setFile(files[0]);
    setIsSuccess(false);
  };

  const protectPDF = async () => {
    if (!file || !password) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Load and save with pdf-lib to ensure valid structure
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfBytes = await pdfDoc.save();
      
      // Apply encryption
      const encryptedBytes = await encryptPDF(pdfBytes, password);
      
      const blob = new Blob([encryptedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `sifreli_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsSuccess(true);
    } catch (error) {
      console.error('Encryption error:', error);
      alert('Şifreleme işlemi sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStrengthLabel = () => {
    if (strength === 0) return 'Çok Zayıf';
    if (strength <= 2) return 'Zayıf';
    if (strength <= 3) return 'Orta';
    if (strength <= 4) return 'Güçlü';
    return 'Çok Güçlü';
  };

  const getStrengthColor = () => {
    if (strength === 0) return 'bg-zinc-200 dark:bg-zinc-800';
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 3) return 'bg-orange-500';
    if (strength <= 4) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">PDF Şifrele</h2>
        <p className="text-muted-foreground mt-2">
          PDF dosyalarınıza parola ekleyerek verilerinizi koruyun.
        </p>
      </div>

      {!file ? (
        <FileUpload 
          onFilesSelected={handleFileSelected} 
          multiple={false} 
          label="Şifrelenecek PDF dosyasını seçin" 
        />
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* File Card */}
          <div className="p-6 rounded-3xl border border-border bg-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-lg">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={() => {
                setFile(null);
                setPassword('');
                setIsSuccess(false);
              }}
              className="text-sm text-destructive hover:underline"
            >
              Değiştir
            </button>
          </div>

          {!isSuccess ? (
            <div className="p-8 rounded-3xl border border-border bg-card space-y-6 shadow-xl relative overflow-hidden">
              <div className="space-y-4">
                <label className="text-sm font-bold block text-muted-foreground">Dosya Parolasını Belirleyin</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Güçlü bir parola girin..."
                    className="w-full h-14 bg-secondary/50 border border-border rounded-2xl px-12 focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-lg placeholder:text-muted-foreground/50"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Strength Meter */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-muted-foreground">Parola Gücü</span>
                    <span className={cn(
                      strength === 0 ? "text-muted-foreground" : 
                      strength <= 2 ? "text-red-500" : 
                      strength <= 3 ? "text-orange-500" : 
                      strength <= 4 ? "text-yellow-500" : "text-emerald-500"
                    )}>
                      {getStrengthLabel()}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-full flex-1 first:rounded-l-full last:rounded-r-full transition-all duration-500",
                          i <= strength ? getStrengthColor() : "bg-zinc-200 dark:bg-zinc-800"
                        )} 
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
                  <ShieldAlert className="text-primary shrink-0" size={18} />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Bu parola, PDF dosyasını açmak için gereklidir. Lütfen parolanızı güvenli bir yerde saklayın; unutulan parolalar kurtarılamaz.
                  </p>
                </div>
              </div>

              <button
                disabled={isProcessing || !password}
                onClick={protectPDF}
                className={cn(
                  "w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg",
                  !isProcessing && password
                    ? "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]" 
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Şifreleniyor...
                  </>
                ) : (
                  <>
                    <Lock size={20} />
                    PDF'i Şifrele ve İndir
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-12 rounded-3xl border border-primary/20 bg-primary/5 text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-bold">Dosya Başarıyla Şifrelendi!</h3>
              <p className="text-muted-foreground">
                Şifrelenmiş PDF dosyanız otomatik olarak indirildi.
              </p>
              <button
                onClick={() => {
                  setFile(null);
                  setPassword('');
                  setIsSuccess(false);
                }}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                Yeni Dosya Şifrele
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
