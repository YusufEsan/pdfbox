"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileAudio, Play, Pause, Square, Loader2, 
  Volume2, Settings2, Download, FileText,
  SkipBack, SkipForward, Info, Trash2
} from 'lucide-react';
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
    const v = "1.6.0";

    const [file, setFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [text, setText] = useState("");
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    
    const isInitializingRef = useRef(false);
    
    const [speed, setSpeed] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    
    const ttsModuleRef = useRef<any>(null);
    const ttsEngineRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
    const sentencesRef = useRef<string[]>([]);
    const currentIndexRef = useRef(0);
    const stopRequestedRef = useRef(false);
    
    const { toast } = useToast();

    // Clean text for TTS - Striker version 1.5.6
    const cleanTextForTTS = (rawText: string) => {
        // 1. Basic cleanup: keep only useful characters
        let cleaned = rawText
            .replace(/[^\w\sğüşıöçĞÜŞİÖÇ.,!?;:-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // 2. Filter garbage words (heuristic to avoid OOV crashes)
        const words = cleaned.split(' ');
        const validWords = words.filter(word => {
            if (word.length > 25) return false; 
            if (word.length > 3) {
                const vowels = /[aeıioöuüAEIİOÖUÜ]/;
                if (!vowels.test(word)) return false;
            }
            return true;
        });

        return validWords.join(' ');
    };

    // Split text into sentences for chunking
    const splitIntoSentences = (longText: string) => {
        return longText.match(/[^.!?]+[.!?]+/g) || [longText];
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
                if (!w.Module) {
                   await loadScript(`/lib/sherpa-onnx/sherpa-onnx-wasm-main-tts.js?v=${v}_${ts}`, "sherpa-wasm-main");
                }
                
                console.log(`SherpaONNX: Loading FINAL bridge (v${v})...`);
                await loadScript(`/lib/sherpa-onnx/sherpa-onnx-tts-v${v.replace(/\./g, '')}.js?v=${v}_${ts}`, "sherpa-bridge-v" + v);
                
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
            { path: '/model.onnx', url: `/models/piper/tr_TR-fettah-medium.onnx?v=${v}` },
            { path: '/model.onnx.json', url: `/models/piper/tr_TR-fettah-medium.onnx.json?v=${v}` },
            { path: '/tokens.txt', url: `/models/piper/tokens.txt?v=${v}` },
            { path: '/espeak-ng-data/phondata', url: '/lib/sherpa-onnx/espeak-ng-data/phondata' },
            { path: '/espeak-ng-data/phonindex', url: '/lib/sherpa-onnx/espeak-ng-data/phonindex' },
            { path: '/espeak-ng-data/phontab', url: '/lib/sherpa-onnx/espeak-ng-data/phontab' },
            { path: '/espeak-ng-data/phondata-manifest', url: '/lib/sherpa-onnx/espeak-ng-data/phondata-manifest' },
            { path: '/espeak-ng-data/intonations', url: '/lib/sherpa-onnx/espeak-ng-data/intonations' },
            { path: '/espeak-ng-data/tr_dict', url: '/lib/sherpa-onnx/espeak-ng-data/tr_dict' },
            { path: '/espeak-ng-data/en_dict', url: '/lib/sherpa-onnx/espeak-ng-data/en_dict' },
            // Single Canonical Turkish Path to avoid FS conflicts (Errno 2)
            { path: '/espeak-ng-data/lang/trk/tr', url: '/lib/sherpa-onnx/espeak-ng-data/lang/trk/tr' }
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
                    dictDir: '/espeak-ng-data',
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

            setText(fullText);
            setStatus("Metin hazır");
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
        const targetedText = overrideText || text;
        if (!ttsEngineRef.current || !targetedText) return;
        
        if (isPlaying && !overrideText) { 
            stop(); 
            return; 
        }

        stopRequestedRef.current = false;
        setIsPlaying(true);
        setStatus("Seslendiriliyor...");

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            
            const cleanedText = cleanTextForTTS(targetedText);
            const sentences = splitIntoSentences(cleanedText);
            sentencesRef.current = sentences;
            currentIndexRef.current = 0;
            
            await speakSegment(0);
        } catch (error) {
            console.error("Seslendirme Hatası:", error);
            const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
            setIsPlaying(false);
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
                speed: speed
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
        
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        source.onended = () => {
            if (!stopRequestedRef.current) {
                speakSegment(index + 1);
            }
        };

        source.start();
        audioSourceRef.current = source;
    };

    const stop = () => {
        stopRequestedRef.current = true;
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
        sentencesRef.current = [];
        currentIndexRef.current = 0;
        setIsPlaying(false);
        setStatus("Durduruldu");
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card className="p-8 border-dashed border-2 bg-gradient-to-br from-background/50 to-muted/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all duration-300">
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-amber-600 rounded-full blur opacity-25" />
                        <div className="relative bg-background rounded-full p-4 border border-border shadow-xl">
                            <FileAudio className="w-12 h-12 text-primary" />
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-amber-600">
                            PDF Seslendirici (v1.4.6)
                        </h2>
                        <p className="text-muted-foreground max-w-md mx-auto mt-2">
                            Türkçe Piper Neural TTS teknolojisi. Tamamen tarayıcıda, anonim ve hızlı.
                        </p>
                    </div>
                    
                    <FileUpload 
                        onFilesSelected={(files) => handleFileChange(files[0])} 
                        accept=".pdf"
                        multiple={false}
                        disabled={isModelLoading || !isEngineReady}
                    />

                    {isModelLoading && (
                        <div className="w-full space-y-2">
                            <div className="flex items-center justify-center gap-2 text-primary font-medium">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{status}</span>
                            </div>
                            <Progress value={progress || 10} className="h-2 w-full" />
                        </div>
                    )}
                </div>
            </Card>

            {file && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="md:col-span-2 p-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold">İçerik Önizleme</h3>
                            </div>
                            <Badge variant="outline">{file.name}</Badge>
                        </div>
                        <div className="h-[400px] overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap font-serif">
                            {isExtracting ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p>Metin analiz ediliyor...</p>
                                </div>
                            ) : text || "Metin bulunamadı."}
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <Card className="p-6 border-primary/10">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings2 className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold">Ses Ayarları</h3>
                            </div>
                            
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            Hız
                                            <Badge variant="secondary" className="px-1 py-0">{speed}x</Badge>
                                        </span>
                                    </div>
                                    <Slider 
                                        value={[speed]} 
                                        onValueChange={([val]: number[]) => setSpeed(val)}
                                        min={0.5} 
                                        max={2.0} 
                                        step={0.1}
                                        className="py-4"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            Ses Seviyesi
                                            <Badge variant="secondary" className="px-1 py-0">{Math.round(volume * 100)}%</Badge>
                                        </span>
                                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <Slider 
                                        value={[volume]} 
                                        onValueChange={([val]: number[]) => setVolume(val)}
                                        min={0} 
                                        max={1.0} 
                                        step={0.05}
                                        className="py-4"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <Button 
                                    className="w-full text-lg h-12 shadow-lg shadow-primary/20 bg-gradient-to-r from-red-600 to-amber-600"
                                    disabled={!isEngineReady || !text || isExtracting}
                                    onClick={() => speak()}
                                >
                                    {isPlaying ? (
                                        <><Pause className="mr-2 h-5 w-5" /> Duraklat</>
                                    ) : (
                                        <><Play className="mr-2 h-5 w-5" /> Dinle</>
                                    )}
                                </Button>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" size="sm" onClick={stop} disabled={!isPlaying}>
                                        <Square className="mr-2 h-4 w-4" /> Durdur
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <Alert className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                            <Info className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-700 dark:text-amber-400">İpucu</AlertTitle>
                            <AlertDescription className="text-amber-600/80 dark:text-amber-500/80 text-xs">
                                Uzun PDF'lerde ilk paragraf seslendirilir. Ses motoru tarayıcı belleğini korumak için korumalı modda çalışmaktadır.
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceTool;
