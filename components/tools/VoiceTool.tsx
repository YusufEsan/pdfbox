"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
    FileAudio, 
    Upload, 
    Play, 
    Square, 
    Loader2, 
    AlertCircle, 
    Info,
    Check,
    Languages,
    History,
    FileText,
    Pencil,
    Save,
    Type,
    Pause
} from "lucide-react";
import * as pdfjs from 'pdfjs-dist';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Progress } from '../ui/progress';
import { useToast } from '../../hooks/use-toast';
import FileUpload from '../FileUpload';
import { 
    Alert,
    AlertDescription,
    AlertTitle,
} from "../ui/alert";
import { Badge } from "../ui/badge";

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TTSResult {
    samples: Float32Array;
    sampleRate: number;
}

const VoiceTool = () => {
    // Definitive version for the Final Stand
    const v = "1.9.9";
    const BP = process.env.NODE_ENV === 'production' ? '/pdfbox' : '';

    const [mode, setMode] = useState<'pdf' | 'manual'>('pdf');
    const [file, setFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [text, setText] = useState("");
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState("");
    const [freeText, setFreeText] = useState(""); // State for Manual Mode
    const [volume, setVolume] = useState(1.0);
    const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
    const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
    const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const currentBufferDurationRef = useRef<number>(0);
    const [status, setStatus] = useState<string>("");
    
    const isInitializingRef = useRef(false);
    
    const ttsModuleRef = useRef<any>(null);
    const ttsEngineRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    
    const sentencesRef = useRef<string[]>([]);
    const currentIndexRef = useRef(0);
    const stopRequestedRef = useRef(false);
    
    const { toast } = useToast();

    // v1.9.5: Real-time volume update
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current?.currentTime || 0);
        }
    }, [volume]);

    // v1.9.5: Stop playback on mode switch
    useEffect(() => {
        stop();
    }, [mode]);

    // Clean text for TTS - v1.6.6 (Magnet Healing)
    const cleanTextForTTS = (rawText: string) => {
        if (!rawText) return "";
        
        // 1. Unicode Normalization & Basic Cleanup
        let cleaned = rawText.normalize('NFC')
            .replace(/[•\*\-]/g, ', ')
            .replace(/[^\w\sğüşıöçĞÜŞİÖÇ.,!?;:-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // 2. STAGE 1: Bridge Fragment Healing
        // Fixes "yeti ş tirilmesi" or "Örne ğ in" instantly
        cleaned = cleaned.replace(/([a-zA-Z0-9ğüşıöçĞÜŞİÖÇ])\s+([ğüşıöçĞÜŞİÖÇ])\s+([a-zA-Z0-9ğüşıöçĞÜŞİÖÇ])/g, '$1$2$3');
        cleaned = cleaned.replace(/([a-zA-Z0-9ğüşıöçĞÜŞİÖÇ])\s+([ğüşıöçĞÜŞİÖÇ])(?=\s|\b|[.,!?;:])/g, '$1$2');
        cleaned = cleaned.replace(/(?<=\s|\b|^)([ğüşıöçĞÜŞİÖÇ])\s+([a-zA-Z0-9ğüşıöçĞÜŞİÖÇ])/g, '$1$2');

        // 3. STAGE 2: Iterative Singleton Healing (v1.6.6)
        // For general orphans like "i" or shattered words like "s a n a l"
        const validOneLetterWords = /^[oO0-9]$/; 
        for (let pass = 0; pass < 6; pass++) {
            const words = cleaned.split(' ');
            let healed: string[] = [];
            let changed = false;

            for (let i = 0; i < words.length; i++) {
                const current = words[i];
                const next = words[i + 1];

                if (next !== undefined) {
                    // Rule: Join if either is length 1 and NOT a valid word
                    if ((current.length === 1 && !validOneLetterWords.test(current)) || 
                        (next.length === 1 && !validOneLetterWords.test(next))) {
                        healed.push(current + next);
                        i++; 
                        changed = true;
                    } else {
                        healed.push(current);
                    }
                } else {
                    healed.push(current);
                }
            }
            cleaned = healed.join(' ');
            if (!changed) break;
        }

        // 4. Punctuation Spacing Cleanup
        return cleaned
            .replace(/\s+([.,!?;:])/g, '$1') 
            .replace(/([.,!?;:])(?=[a-zA-ZğüşıöçĞÜŞİÖÇ0-9])/g, '$1 ')
            .trim();
    };

    // Split text into sentences for chunking - v1.6.2 List-Aware
    const splitIntoSentences = (longText: string) => {
        // 1. Split by standard punctuation
        const segments: string[] = Array.from(longText.match(/[^.!?:\;]+[.!?:\;]+/g) || []);
        
        // 2. Handle list-like structures (split by remaining large chunks)
        const matchedText = segments.join('');
        const remaining = longText.slice(matchedText.length).trim();
        
        if (remaining) {
            // Check if remaining has commas or enough length to be a sentence
            if (remaining.length > 3) segments.push(remaining + ".");
        }
        
        // 3. Post-process segments to ensure they aren't too massive
        const final: string[] = [];
        segments.forEach(s => {
            const trimmed = s.trim();
            if (trimmed.length > 150) {
                // Split long run-on sentences by commas if needed
                const sub = trimmed.split(/[,]/);
                sub.forEach(part => {
                   if (part.trim().length > 0) final.push(part.trim() + ".");
                });
            } else if (trimmed.length > 0) {
                final.push(trimmed);
            }
        });

        return final.length > 0 ? final : [longText];
    };

    useEffect(() => {
        // STRICT SYNCHRONOUS INITIALIZATION GUARD (v1.5.9)
        if (typeof window === 'undefined') return;
        if (isInitializingRef.current) return;
        
        const w = window as any;
        if (w.__SHERPA_TTS_BRIDGE_VERSION__ === v && ttsEngineRef.current) {
            console.log("SherpaONNX: Engine already active.");
            return;
        }

        isInitializingRef.current = true;
        
        const initProcess = async () => {
            console.log(`SherpaONNX: Starting initialization (v${v} - BYTE PERFECT)...`);
            setIsModelLoading(true);

            try {
                const loadScript = (src: string, id: string) => {
                    return new Promise((res, rej) => {
                        const existing = document.getElementById(id);
                        if (existing) existing.remove();
                        
                        const script = document.createElement('script');
                        script.src = src;
                        script.id = id;
                        script.onload = res;
                        script.onerror = rej;
                        document.head.appendChild(script);
                    });
                };

                const ts = Date.now();
                
                // Ensure WASM main is loaded exactly once
                if (!document.getElementById("sherpa-wasm-main")) {
                    await loadScript(`${BP}/lib/sherpa-onnx/sherpa-onnx-wasm-main-tts.js?v=${v}_${ts}`, "sherpa-wasm-main");
                }
                
                console.log(`SherpaONNX: Loading FINAL bridge (v${v})...`);
                if (!document.getElementById("sherpa-bridge-v" + v)) {
                    await loadScript(`${BP}/lib/sherpa-onnx/sherpa-onnx-tts-v${v.replace(/\./g, '')}.js?v=${v}_${ts}`, "sherpa-bridge-v" + v);
                }
                
                // Wait for bridge version to be set
                let bridgeWait = 0;
                while (w.__SHERPA_TTS_BRIDGE_VERSION__ !== v && bridgeWait < 30) {
                    await new Promise(r => setTimeout(r, 100));
                    bridgeWait++;
                }

                if (w.__SHERPA_TTS_BRIDGE_VERSION__ !== v) {
                    throw new Error(`CRITICAL: Bridge version mismatch! Got ${w.__SHERPA_TTS_BRIDGE_VERSION__}, need ${v}.`);
                }

                setStatus("Modeller hazırlanıyor...");
                await initializeTTSEngine();
                setIsEngineReady(true);
                setStatus("Hazır");
            } catch (error) {
                console.error("TTS Yükleme Hatası:", error);
                const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
                setStatus(`Hata: ${msg}`);
                toast({
                    title: "Hata",
                    description: "Ses motoru yüklenirken bir problem oluştu: " + msg,
                    variant: "destructive"
                });
            } finally {
                setIsModelLoading(false);
            }
        };

        initProcess();

        return () => {
            if (audioSourceRef.current) audioSourceRef.current.stop();
            if (ttsEngineRef.current) {
                try { ttsEngineRef.current.free(); } catch(e) {}
            }
        };
    }, []);

    const initializeTTSEngine = async () => {
        const w = window as any;
        
        // Robust wait for w.Module to appear (fix "Module not found" race condition)
        let attempts = 0;
        while (!w.Module && attempts < 50) {
            console.log(`SherpaONNX: Waiting for w.Module (attempt ${attempts+1})...`);
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (!w.Module) throw new Error("SherpaONNX Module not found after 5s");
        
        const sherpaModule = w.Module;

        if (!sherpaModule.calledRun) {
            await new Promise<void>((resolve) => {
                const checkReady = () => {
                    if (sherpaModule.calledRun) {
                        resolve();
                    } else {
                        setTimeout(checkReady, 50);
                    }
                };
                checkReady();
            });
        }

        const filesToLoad = [
            { path: '/model.onnx', url: `${BP}/models/piper/tr_TR-fettah-medium.onnx?v=${v}` },
            { path: '/model.onnx.json', url: `${BP}/models/piper/tr_TR-fettah-medium.onnx.json?v=${v}` },
            { path: '/tokens.txt', url: `${BP}/models/piper/tokens.txt?v=${v}` },
            { path: '/espeak-ng-data/phondata', url: `${BP}/lib/sherpa-onnx/espeak-ng-data/phondata` },
            { path: '/espeak-ng-data/phonindex', url: `${BP}/lib/sherpa-onnx/espeak-ng-data/phonindex` },
            { path: '/espeak-ng-data/phontab', url: `${BP}/lib/sherpa-onnx/espeak-ng-data/phontab` },
            { path: '/espeak-ng-data/phondata-manifest', url: `${BP}/lib/sherpa-onnx/espeak-ng-data/phondata-manifest` },
            { path: '/espeak-ng-data/intonations', url: `${BP}/lib/sherpa-onnx/espeak-ng-data/intonations` },
            { path: '/espeak-ng-data/tr_dict', url: `${BP}/lib/sherpa-onnx/espeak-ng-data/tr_dict` },
            { path: '/espeak-ng-data/en_dict', url: `${BP}/lib/sherpa-onnx/espeak-ng-data/en_dict` },
            // Single Canonical Turkish Path to avoid FS conflicts (Errno 2)
            { path: '/espeak-ng-data/lang/trk/tr', url: `${BP}/lib/sherpa-onnx/espeak-ng-data/lang/trk/tr` }
        ];

        const fs = sherpaModule.FS;
        try {
            console.log("SherpaONNX: Ensuring directory structure...");
            // Robust recursive mkdir for Emscripten
            const ensureDir = (path: string) => {
                const parts = path.split('/').filter(p => p);
                let current = '';
                for (let i = 0; i < parts.length - 1; i++) {
                    current += '/' + parts[i];
                    try {
                        const analyze = fs.analyzePath(current);
                        if (!analyze.exists) {
                            fs.mkdir(current);
                        }
                    } catch(e) {}
                }
            };

            for (const f of filesToLoad) {
                ensureDir(f.path);
                const resp = await fetch(f.url);
                if (!resp.ok) {
                    console.warn(`SherpaONNX: Failed to fetch ${f.url}`);
                    continue;
                }
                const arrayBuffer = await resp.arrayBuffer();
                try {
                    const analyze = fs.analyzePath(f.path);
                    if (analyze.exists) fs.unlink(f.path);
                } catch(e) {}
                fs.writeFile(f.path, new Uint8Array(arrayBuffer));
                console.log(`SherpaONNX: File loaded: ${f.path}`);
            }
        } catch (e) {
            console.error("FS error:", e);
        }
        
        const engineConfig = {
            offlineTtsModelConfig: {
                offlineTtsVitsModelConfig: {
                    model: '/model.onnx',
                    lexicon: '', // MUST BE EMPTY for Fettah
                    tokens: '/tokens.txt',
                    dataDir: '/espeak-ng-data',
                    dictDir: '',
                    noiseScale: 0.667,
                    noiseScaleW: 0.8,
                    lengthScale: 1.0,
                },
                numThreads: 1,
                debug: 1, 
                provider: 'cpu',
            },
            ruleFsts: '',
            ruleFars: '',
            maxNumSentences: 1,
            silenceScale: 0.2,
        };

        if (typeof w.createOfflineTts !== 'function') {
            throw new Error("createOfflineTts function not found. Bridge load failed.");
        }

        console.log("SherpaONNX: Creating TTS instance...");
        const tts = w.createOfflineTts(sherpaModule, engineConfig);
        if (!tts || !tts.handle) {
            throw new Error("TTS Engine creation failed (null handle)");
        }
        ttsEngineRef.current = tts;
        ttsModuleRef.current = sherpaModule;
    };

    const handleFileChange = async (selectedFile: File) => {
        setFile(selectedFile);
        setIsExtracting(true);
        setStatus("Metin çıkarılıyor...");

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map((item: any) => item.str).join(" ");
                fullText += pageText + "\n";
                setProgress((i / pdf.numPages) * 100);
            }

            const healedText = cleanTextForTTS(fullText);
            setText(healedText);
            setEditedText(healedText);
            setStatus("Metin yüklendi.");
        } catch (error) {
            toast({
                title: "Hata",
                description: "PDF metni okunurken hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsExtracting(false);
            setProgress(0);
        }
    };

    const speak = async (overrideText: string = "") => {
        let targetedText = "";
        
        if (mode === 'manual') {
            targetedText = overrideText || freeText;
        } else {
            targetedText = overrideText || (isEditing ? editedText : text);
        }
        
        if (!ttsEngineRef.current || !targetedText) return;
        
        // v1.9.8: Hardware-level resume if suspended
        if (isPaused && audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
            setIsPaused(false);
            setIsPlaying(true);
            setStatus("Devam ediyor...");
            return;
        }

        // If already playing, we trigger pause (suspend)
        if (isPlaying && !isPaused && !overrideText) { 
            pause(); 
            return; 
        }

        stopRequestedRef.current = false;
        setIsPlaying(true);
        const isResuming = isPaused && audioContextRef.current?.state === 'suspended';
        
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            
            // If the context was left suspended, resume it
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            
            if (!isResuming) {
                const cleanedText = cleanTextForTTS(targetedText);
                const sentences = splitIntoSentences(cleanedText);
                sentencesRef.current = sentences;
                currentIndexRef.current = 0;
                await speakSegment(currentIndexRef.current);
            }
        } catch (error) {
            console.error("Seslendirme Hatası:", error);
            const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
            setIsPlaying(false);
            setIsPaused(false);
            setStatus(`Hata: ${msg}`);
            toast({
                title: "Seslendirme Hatası",
                description: msg,
                variant: "destructive"
            });
        }
    };

    const speakSegment = async (index: number) => {
        if (stopRequestedRef.current || !sentencesRef.current[index] || !ttsEngineRef.current) {
            if (!stopRequestedRef.current) {
                setIsPlaying(false);
                setStatus("Tamamlandı");
            }
            return;
        }

        currentIndexRef.current = index;
        const segment = sentencesRef.current[index];
        console.log(`SherpaONNX: Generating segment ${index+1}/${sentencesRef.current.length}:`, segment);
        setStatus(`Okunuyor: ${index+1}/${sentencesRef.current.length}`);

        try {
            const result = ttsEngineRef.current.generate({
                text: segment, 
                sid: 0,
                speed: 1.0
            });

            if (!result || !result.samples) {
                throw new Error("Segment üretimi başarısız.");
            }

            playAudio(result, index);
        } catch (e) {
            console.error("Segment Hatası:", e);
            speakSegment(index + 1); // Try next segment on error
        }
    };

    const playAudio = (result: TTSResult, index: number) => {
        if (!audioContextRef.current) return;

        console.log(`SherpaONNX: Playback segment ${index+1} (${result.samples.length} samples)`);

        const buffer = audioContextRef.current.createBuffer(1, result.samples.length, result.sampleRate);
        buffer.getChannelData(0).set(result.samples);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        
        // v1.9.5: Use persistent GainNode for real-time control
        if (!gainNodeRef.current) {
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);
        }
        gainNodeRef.current.gain.value = volume;
        
        source.connect(gainNodeRef.current);

        // v1.9.9: Word-level highlight tracking
        setActiveSentenceIndex(index);
        startTimeRef.current = audioContextRef.current.currentTime;
        currentBufferDurationRef.current = buffer.duration;
        
        const words = sentencesRef.current[index].split(/\s+/).filter(w => w.length > 0);
        
        if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
        
        highlightIntervalRef.current = setInterval(() => {
            if (!audioContextRef.current || audioContextRef.current.state === 'suspended') return;
            
            const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
            const progress = elapsed / currentBufferDurationRef.current;
            const wordIdx = Math.min(Math.floor(progress * words.length), words.length - 1);
            
            setActiveWordIndex(wordIdx);
            
            // Auto-scroll highlight into view
            const activeEl = document.getElementById(`word-${index}-${wordIdx}`);
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        }, 50);

        source.onended = () => {
            if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
            setActiveWordIndex(null);
            if (!stopRequestedRef.current) {
                speakSegment(index + 1);
            }
        };

        source.start();
        audioSourceRef.current = source;
    };

    const pause = async () => {
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
            await audioContextRef.current.suspend();
            if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
            setIsPaused(true);
            setStatus("Duraklatıldı");
        }
    };

    const stop = async () => {
        stopRequestedRef.current = true;
        if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
        setActiveSentenceIndex(null);
        setActiveWordIndex(null);
        
        // v1.9.8: Must resume before stopping to clear buffers correctly
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.stop();
            } catch (e) { /* ignore already stopped */ }
            audioSourceRef.current = null;
        }
        sentencesRef.current = [];
        currentIndexRef.current = 0;
        setIsPlaying(false);
        setIsPaused(false);
        setStatus("Durduruldu");
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card className="p-8 border-none bg-indigo-950/10 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden">
                {/* Brand Gradient Glow */}
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px]" />
                
                <div className="relative flex flex-col items-center gap-8 text-center">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-900/40 p-1.5 rounded-2xl ring-1 ring-white/5 backdrop-blur-md transition-all duration-500 overflow-hidden">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={!isEngineReady}
                            onClick={() => setMode('pdf')}
                            className={`rounded-xl px-6 h-9 transition-all duration-300 ${mode === 'pdf' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            PDF Seslendirici
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={!isEngineReady}
                            onClick={() => setMode('manual')}
                            className={`rounded-xl px-6 h-9 transition-all duration-300 ${mode === 'manual' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
                        >
                            <Pencil className="w-4 h-4 mr-2" />
                            Serbest Metin
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25" />
                        <div className="relative bg-background rounded-full p-4 border border-border shadow-xl">
                            <FileAudio className="w-12 h-12 text-primary" />
                        </div>
                    </div>

                    <div className="space-y-4 w-full">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                {mode === 'pdf' ? "PDF Seslendirici" : "Serbest Metin"}
                            </h2>
                            <p className="text-muted-foreground max-w-md mx-auto mt-2">
                                {mode === 'pdf' 
                                    ? "Türkçe Piper Neural TTS teknolojisi. Tamamen tarayıcıda, anonim ve hızlı."
                                    : "İstediğiniz metni doğrudan buraya yazın veya yapıştırın."}
                            </p>
                        </div>
                    </div>

                    {!isEngineReady ? (
                        <div className="w-full py-12 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-1000">
                             <div className="relative">
                                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                                <Loader2 className="w-16 h-16 animate-spin text-primary relative" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-slate-200">Sistem Hazırlanıyor...</h3>
                                <p className="text-slate-500 text-sm max-w-[280px]">Türkçe Neural TTS motoru tarayıcınıza yükleniyor. Lütfen bekleyiniz.</p>
                                <div className="mt-4 flex items-center justify-center gap-2 text-primary/70 text-xs font-mono bg-primary/5 py-1 px-3 rounded-full border border-primary/10">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    {status || "Başlatılıyor"}
                                </div>
                            </div>
                        </div>
                    ) : mode === 'pdf' ? (
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (!isEngineReady) return;
                                const droppedFile = e.dataTransfer.files[0];
                                if (droppedFile && droppedFile.type === 'application/pdf') {
                                    handleFileChange(droppedFile);
                                }
                            }}
                            className={`w-full h-48 rounded-3xl border-2 border-dashed border-slate-800 transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center gap-4 group animate-in fade-in slide-in-from-top-4
                                ${isEngineReady 
                                    ? "hover:border-primary/50 bg-slate-900/10 cursor-pointer" 
                                    : "opacity-40 cursor-not-allowed bg-slate-900/5"}`}
                            onClick={() => {
                                if (isEngineReady) document.getElementById('pdf-upload')?.click();
                            }}
                        >
                            <input
                                id="pdf-upload"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];
                                    if (selectedFile) handleFileChange(selectedFile);
                                }}
                                className="hidden"
                            />
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 text-primary" />
                            </div>
                            <div className="text-center relative">
                                <p className="font-semibold text-slate-300">PDF yüklemek için tıklayın veya sürükleyin</p>
                                <p className="text-slate-500 text-sm">Seslendirilecek metni pdf'den ayıklayalım</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-4">
                            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                                <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2.5 rounded-2xl border border-slate-800/50 shadow-inner">
                                    <FileAudio className={`w-5 h-5 ${volume === 0 ? 'text-slate-500' : 'text-blue-400 animate-pulse-slow'}`} />
                                    <Slider
                                        value={[volume * 100]}
                                        max={200}
                                        step={1}
                                        onValueChange={(vals) => setVolume(vals[0] / 100)}
                                        className="w-32"
                                    />
                                    <span className="text-sm font-mono text-slate-400 w-10 text-right">
                                        {Math.round(volume * 100)}%
                                    </span>
                                </div>

                                <Button
                                    onClick={() => speak()}
                                    disabled={!freeText || !isEngineReady}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/20 h-14 px-10 rounded-2xl gap-3 font-bold text-lg transition-all active:scale-95"
                                >
                                    {isPlaying && !isPaused ? (
                                        <><Pause className="w-5 h-5 fill-current" /> Duraklat</>
                                    ) : (
                                        <><Play className="w-5 h-5 fill-current" /> {isPaused ? "Devam Et" : "Metni Seslendir"}</>
                                    )}
                                </Button>

                                {(isPlaying || isPaused) && (
                                    <Button 
                                        variant="outline" 
                                        size="icon"
                                        className="w-14 h-14 rounded-2xl border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400"
                                        onClick={stop}
                                    >
                                        <Square className="h-6 w-6 fill-current" />
                                    </Button>
                                )}
                            </div>
                            <div className="h-[300px] overflow-hidden rounded-3xl ring-1 ring-indigo-500/10 bg-slate-950/40 p-1 shadow-2xl backdrop-blur-2xl">
                                <textarea
                                    value={freeText}
                                    onChange={(e) => setFreeText(e.target.value)}
                                    className="w-full h-full bg-transparent p-8 text-base leading-relaxed font-sans antialiased text-slate-300 outline-none resize-none scrollbar-thin scrollbar-thumb-slate-800 placeholder:text-slate-700"
                                    placeholder="Buraya istediğiniz metni yazın..."
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {(mode === 'pdf' || freeText) && (
                <div className={`mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 ${mode === 'manual' && (isPlaying || activeSentenceIndex !== null) ? 'block' : (mode === 'manual' ? 'hidden' : 'block')}`}>
                    <Card className="p-8 border-none bg-slate-900/30 backdrop-blur-2xl shadow-none">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-lg leading-none mb-2">Canlı Takip & Önizleme</h3>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {mode === 'pdf' && file && (
                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight px-2 h-5 bg-slate-800/80 border-slate-700 text-slate-300 max-w-[200px] truncate">
                                                {file.name}
                                            </Badge>
                                        )}
                                        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                                            <Type className="w-3.5 h-3.5" />
                                            <span className="text-xs">{(isEditing ? editedText : (mode === 'manual' ? freeText : text)).length.toLocaleString()} karakter</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-800/50">
                                    <FileAudio className={`w-4 h-4 ${volume === 0 ? 'text-slate-500' : 'text-blue-400 animate-pulse-slow'}`} />
                                    <Slider
                                        value={[volume * 100]}
                                        max={200}
                                        step={1}
                                        onValueChange={(vals) => setVolume(vals[0] / 100)}
                                        className="w-24"
                                    />
                                    <span className="text-[10px] font-mono text-slate-500 w-8 text-right">
                                        {Math.round(volume * 100)}%
                                    </span>
                                </div>

                                <div className="h-6 w-px bg-slate-800/50 mx-1" />

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (isEditing) {
                                            setText(editedText);
                                        } else {
                                            setEditedText(text);
                                        }
                                        setIsEditing(!isEditing);
                                    }}
                                    disabled={isExtracting || isPlaying}
                                    className="h-10 px-4 bg-slate-900/50 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 rounded-xl transition-all"
                                >
                                    {isEditing ? (
                                        <>
                                            <Save className="w-4 h-4 text-emerald-500" />
                                            Kaydet
                                        </>
                                    ) : (
                                        <>
                                            <Pencil className="w-4 h-4 text-blue-400" />
                                            Düzenle
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={() => speak()}
                                    disabled={!text || isExtracting || isEditing || !isEngineReady}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 h-10 px-6 rounded-xl gap-2 font-semibold transition-all min-w-[120px]"
                                >
                                    {isPlaying && !isPaused ? (
                                        <><Pause className="mr-2 h-4 w-4" /> Duraklat</>
                                    ) : (
                                        <><Play className="mr-2 h-4 w-4" /> {isPaused ? "Devam" : "Dinle"}</>
                                    )}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="w-10 h-10 rounded-xl border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400"
                                    onClick={stop} 
                                    disabled={!isPlaying && !isPaused}
                                >
                                    <Square className="h-4 w-4 fill-current" />
                                </Button>
                            </div>
                        </div>

                        <div className="h-[550px] overflow-hidden rounded-3xl ring-1 ring-indigo-500/10 bg-slate-950/40 p-1 shadow-2xl backdrop-blur-2xl">
                            {isExtracting ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl animate-pulse" />
                                        <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
                                    </div>
                                    <p className="text-muted-foreground font-medium italic">Metin analiz ediliyor...</p>
                                </div>
                            ) : isEditing ? (
                                <textarea
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="w-full h-full bg-transparent p-8 text-base leading-relaxed font-sans antialiased text-slate-300 outline-none resize-none scrollbar-thin scrollbar-thumb-slate-800 placeholder:text-slate-700"
                                    placeholder="Düzenlemek istediğiniz metni buraya yazın..."
                                />
                            ) : (
                                <div className="w-full h-full overflow-y-auto p-10 text-base leading-relaxed whitespace-pre-wrap font-sans antialiased scrollbar-thin scrollbar-thumb-slate-800 text-slate-300">
                                    {(text || "Metin bulunamadı.").split(/([.!?]+\s+)/).map((part, sIdx) => {
                                        // Simple sentence-level mapping. Note: split with capture group keeps delimiters
                                        // We only want to wrap actual words in the sentence parts
                                        if (part.match(/^[.!?]+\s+$/)) return <span key={`del-${sIdx}`}>{part}</span>;
                                        
                                        // This is a sentence-ish part
                                        const logicalSentenceIdx = Math.floor(sIdx / 2);
                                        const words = part.split(/(\s+)/);
                                        
                                        let currentWordCounter = 0;
                                        return (
                                            <span key={`sent-${logicalSentenceIdx}`} className={activeSentenceIndex === logicalSentenceIdx ? "border-b border-blue-500/20" : ""}>
                                                {words.map((wPart, wIdx) => {
                                                    if (wPart.match(/^\s+$/)) return <span key={`ws-${wIdx}`}>{wPart}</span>;
                                                    
                                                    const wordIdx = currentWordCounter++;
                                                    const isActive = activeSentenceIndex === logicalSentenceIdx && activeWordIndex === wordIdx;
                                                    
                                                    return (
                                                        <span 
                                                            id={`word-${logicalSentenceIdx}-${wordIdx}`}
                                                            key={`word-${wIdx}`} 
                                                            className={`transition-all duration-200 rounded-sm px-0.5 ${isActive ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}`}
                                                        >
                                                            {wPart}
                                                        </span>
                                                    );
                                                })}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Alert className="bg-indigo-950/20 border-indigo-900/20 mx-auto max-w-2xl backdrop-blur-md shadow-lg">
                        <Info className="h-4 w-4 text-indigo-400" />
                        <AlertTitle className="text-indigo-300 font-bold">Ses Motoru Notu</AlertTitle>
                        <AlertDescription className="text-slate-400 text-xs text-center">
                            Piper Neural v1.7.0: Uzun dökümanlar tarayıcı belleğini korumak için semantik parçalara bölünerek işlenir.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
    );
};

export default VoiceTool;
