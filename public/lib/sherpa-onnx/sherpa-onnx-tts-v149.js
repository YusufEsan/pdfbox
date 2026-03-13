if (typeof window !== 'undefined') {
  window.__SHERPA_TTS_BRIDGE_VERSION__ = "1.4.9";
  console.log("%c >>> SherpaONNX Bridge v1.4.9: SOURCE VERIFIED <<< ", "background: #1565c0; color: #fff; font-size: 16px; font-weight: bold;");
}

function copyHeap(Module, src, len, dst) {
  if (Module._CopyHeap) {
    Module._CopyHeap(src, len, dst);
  } else {
    Module.HEAPU8.set(Module.HEAPU8.subarray(src, src + len), dst);
  }
}

function freeConfig(config, Module) {
  if ('buffer' in config) {
    Module._free(config.buffer);
  }

  if ('config' in config) {
    freeConfig(config.config, Module)
  }
  if ('matcha' in config) freeConfig(config.matcha, Module)
  if ('kokoro' in config) freeConfig(config.kokoro, Module)
  if ('zipvoice' in config) freeConfig(config.zipvoice, Module)
  if ('kitten' in config) freeConfig(config.kitten, Module)
  if ('pocket' in config) freeConfig(config.pocket, Module)
  if ('supertonic' in config) freeConfig(config.supertonic, Module)

  if (config.ptr) {
    Module._free(config.ptr);
  }
}

// ---------------------------------------------------------
// Sub-Configs (Based on C++ headers)
// ---------------------------------------------------------

function initSherpaOnnxOfflineTtsVitsModelConfig(config, Module) {
  const modelLen = Module.lengthBytesUTF8(config.model || '') + 1;
  const lexiconLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;
  const tokensLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const dataDirLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const dictDirLen = Module.lengthBytesUTF8(config.dictDir || '') + 1;

  const n = modelLen + lexiconLen + tokensLen + dataDirLen + dictDirLen;
  const buffer = Module._malloc(n);
  const len = 8 * 4; // 5 strings + 3 floats
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.model || '', buffer + offset, modelLen); offset += modelLen;
  Module.stringToUTF8(config.lexicon || '', buffer + offset, lexiconLen); offset += lexiconLen;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokensLen); offset += tokensLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, dataDirLen); offset += dataDirLen;
  Module.stringToUTF8(config.dictDir || '', buffer + offset, dictDirLen); offset += dictDirLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += modelLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += lexiconLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += tokensLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += dataDirLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += dictDirLen;
  Module.setValue(ptr + 5*4, config.noiseScale || 0.667, 'float');
  Module.setValue(ptr + 6*4, config.noiseScaleW || 0.8, 'float');
  Module.setValue(ptr + 7*4, config.lengthScale || 1.0, 'float');

  return { buffer, ptr, len };
}

function initSherpaOnnxOfflineTtsMatchaModelConfig(config, Module) {
  const modelLen = Module.lengthBytesUTF8(config.acousticModel || '') + 1;
  const vocoderLen = Module.lengthBytesUTF8(config.vocoder || '') + 1;
  const lexiconLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;
  const tokensLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const dataDirLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const dictDirLen = Module.lengthBytesUTF8(config.dictDir || '') + 1;

  const n = modelLen + vocoderLen + lexiconLen + tokensLen + dataDirLen + dictDirLen;
  const buffer = Module._malloc(n);
  const len = 8 * 4; // 6 strings + 2 floats
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.acousticModel || '', buffer + offset, modelLen); offset += modelLen;
  Module.stringToUTF8(config.vocoder || '', buffer + offset, vocoderLen); offset += vocoderLen;
  Module.stringToUTF8(config.lexicon || '', buffer + offset, lexiconLen); offset += lexiconLen;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokensLen); offset += tokensLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, dataDirLen); offset += dataDirLen;
  Module.stringToUTF8(config.dictDir || '', buffer + offset, dictDirLen); offset += dictDirLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += modelLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += vocoderLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += lexiconLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += tokensLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += dataDirLen;
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += dictDirLen;
  Module.setValue(ptr + 6*4, config.noiseScale || 1.0, 'float');
  Module.setValue(ptr + 7*4, config.lengthScale || 1.0, 'float');

  return { buffer, ptr, len };
}

function initSherpaOnnxOfflineTtsKokoroModelConfig(config, Module) {
  const modelLen = Module.lengthBytesUTF8(config.model || '') + 1;
  const voicesLen = Module.lengthBytesUTF8(config.voices || '') + 1;
  const tokensLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const lexiconLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;
  const dataDirLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const dictDirLen = Module.lengthBytesUTF8(config.dictDir || '') + 1;
  const langLen = Module.lengthBytesUTF8(config.lang || '') + 1;

  const n = modelLen + voicesLen + tokensLen + lexiconLen + dataDirLen + dictDirLen + langLen;
  const buffer = Module._malloc(n);
  const len = 8 * 4; // 6 strings + 1 float + 1 string
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.model || '', buffer + offset, modelLen); offset += modelLen;
  Module.stringToUTF8(config.voices || '', buffer + offset, voicesLen); offset += voicesLen;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokensLen); offset += tokensLen;
  Module.stringToUTF8(config.lexicon || '', buffer + offset, lexiconLen); offset += lexiconLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, dataDirLen); offset += dataDirLen;
  Module.stringToUTF8(config.dictDir || '', buffer + offset, dictDirLen); offset += dictDirLen;
  Module.stringToUTF8(config.lang || '', buffer + offset, langLen); offset += langLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += modelLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += voicesLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += tokensLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += lexiconLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += dataDirLen;
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += dictDirLen;
  Module.setValue(ptr + 6*4, config.lengthScale || 1.0, 'float');
  Module.setValue(ptr + 7*4, buffer + offset, 'i8*'); offset += langLen;

  return { buffer, ptr, len };
}

function initSherpaOnnxOfflineTtsZipvoiceModelConfig(config, Module) {
  const tokensLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const encoderLen = Module.lengthBytesUTF8(config.encoder || '') + 1;
  const decoderLen = Module.lengthBytesUTF8(config.decoder || '') + 1;
  const vocoderLen = Module.lengthBytesUTF8(config.vocoder || '') + 1;
  const dataDirLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const lexiconLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;

  const n = tokensLen + encoderLen + decoderLen + vocoderLen + dataDirLen + lexiconLen;
  const buffer = Module._malloc(n);
  const len = 10 * 4; // 6 strings + 4 floats
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokensLen); offset += tokensLen;
  Module.stringToUTF8(config.encoder || '', buffer + offset, encoderLen); offset += encoderLen;
  Module.stringToUTF8(config.decoder || '', buffer + offset, decoderLen); offset += decoderLen;
  Module.stringToUTF8(config.vocoder || '', buffer + offset, vocoderLen); offset += vocoderLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, dataDirLen); offset += dataDirLen;
  Module.stringToUTF8(config.lexicon || '', buffer + offset, lexiconLen); offset += lexiconLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += tokensLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += encoderLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += decoderLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += vocoderLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += dataDirLen;
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += lexiconLen;
  Module.setValue(ptr + 6*4, config.featScale || 0.1, 'float');
  Module.setValue(ptr + 7*4, config.tShift || 0.5, 'float');
  Module.setValue(ptr + 8*4, config.targetRms || 0.1, 'float');
  Module.setValue(ptr + 9*4, config.guidanceScale || 1.0, 'float');

  return { buffer, ptr, len };
}

function initSherpaOnnxOfflineTtsKittenModelConfig(config, Module) {
  const modelLen = Module.lengthBytesUTF8(config.model || '') + 1;
  const voicesLen = Module.lengthBytesUTF8(config.voices || '') + 1;
  const tokensLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const dataDirLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;

  const n = modelLen + voicesLen + tokensLen + dataDirLen;
  const buffer = Module._malloc(n);
  const len = 5 * 4; // 4 strings + 1 float
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.model || '', buffer + offset, modelLen); offset += modelLen;
  Module.stringToUTF8(config.voices || '', buffer + offset, voicesLen); offset += voicesLen;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokensLen); offset += tokensLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, dataDirLen); offset += dataDirLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += modelLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += voicesLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += tokensLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += dataDirLen;
  Module.setValue(ptr + 4*4, config.lengthScale || 1.0, 'float');

  return { buffer, ptr, len };
}

function initSherpaOnnxOfflineTtsPocketModelConfig(config, Module) {
  const lmFlowLen = Module.lengthBytesUTF8(config.lmFlow || '') + 1;
  const lmMainLen = Module.lengthBytesUTF8(config.lmMain || '') + 1;
  const encoderLen = Module.lengthBytesUTF8(config.encoder || '') + 1;
  const decoderLen = Module.lengthBytesUTF8(config.decoder || '') + 1;
  const textConditionerLen = Module.lengthBytesUTF8(config.textConditioner || '') + 1;
  const vocabJsonLen = Module.lengthBytesUTF8(config.vocabJson || '') + 1;
  const tokenScoresJsonLen = Module.lengthBytesUTF8(config.tokenScoresJson || '') + 1;

  const n = lmFlowLen + lmMainLen + encoderLen + decoderLen + textConditionerLen + vocabJsonLen + tokenScoresJsonLen;
  const buffer = Module._malloc(n);
  const len = 8 * 4; // 7 strings + 1 bit32 (cache capacity)
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.lmFlow || '', buffer + offset, lmFlowLen); offset += lmFlowLen;
  Module.stringToUTF8(config.lmMain || '', buffer + offset, lmMainLen); offset += lmMainLen;
  Module.stringToUTF8(config.encoder || '', buffer + offset, encoderLen); offset += encoderLen;
  Module.stringToUTF8(config.decoder || '', buffer + offset, decoderLen); offset += decoderLen;
  Module.stringToUTF8(config.textConditioner || '', buffer + offset, textConditionerLen); offset += textConditionerLen;
  Module.stringToUTF8(config.vocabJson || '', buffer + offset, vocabJsonLen); offset += vocabJsonLen;
  Module.stringToUTF8(config.tokenScoresJson || '', buffer + offset, tokenScoresJsonLen); offset += tokenScoresJsonLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += lmFlowLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += lmMainLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += encoderLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += decoderLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += textConditionerLen;
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += vocabJsonLen;
  Module.setValue(ptr + 6*4, buffer + offset, 'i8*'); offset += tokenScoresJsonLen;
  Module.setValue(ptr + 7*4, config.voiceEmbeddingCacheCapacity || 50, 'i32');

  return { buffer, ptr, len };
}

function initSherpaOnnxOfflineTtsSupertonicModelConfig(config, Module) {
  const durPredictLen = Module.lengthBytesUTF8(config.durationPredictor || '') + 1;
  const textEncoderLen = Module.lengthBytesUTF8(config.textEncoder || '') + 1;
  const vectorEstimatorLen = Module.lengthBytesUTF8(config.vectorEstimator || '') + 1;
  const vocoderLen = Module.lengthBytesUTF8(config.vocoder || '') + 1;
  const ttsJsonLen = Module.lengthBytesUTF8(config.ttsJson || '') + 1;
  const uniIndexerLen = Module.lengthBytesUTF8(config.unicodeIndexer || '') + 1;
  const voiceStyleLen = Module.lengthBytesUTF8(config.voiceStyle || '') + 1;

  const n = durPredictLen + textEncoderLen + vectorEstimatorLen + vocoderLen + ttsJsonLen + uniIndexerLen + voiceStyleLen;
  const buffer = Module._malloc(n);
  const len = 7 * 4; // 7 strings
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.durationPredictor || '', buffer + offset, durPredictLen); offset += durPredictLen;
  Module.stringToUTF8(config.textEncoder || '', buffer + offset, textEncoderLen); offset += textEncoderLen;
  Module.stringToUTF8(config.vectorEstimator || '', buffer + offset, vectorEstimatorLen); offset += vectorEstimatorLen;
  Module.stringToUTF8(config.vocoder || '', buffer + offset, vocoderLen); offset += vocoderLen;
  Module.stringToUTF8(config.ttsJson || '', buffer + offset, ttsJsonLen); offset += ttsJsonLen;
  Module.stringToUTF8(config.unicodeIndexer || '', buffer + offset, uniIndexerLen); offset += uniIndexerLen;
  Module.stringToUTF8(config.voiceStyle || '', buffer + offset, voiceStyleLen); offset += voiceStyleLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += durPredictLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += textEncoderLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += vectorEstimatorLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += vocoderLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += ttsJsonLen;
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += uniIndexerLen;
  Module.setValue(ptr + 6*4, buffer + offset, 'i8*'); offset += voiceStyleLen;

  return { buffer, ptr, len };
}

// ---------------------------------------------------------
// Main Model Config Container
// ---------------------------------------------------------

function initSherpaOnnxOfflineTtsModelConfig(config, Module) {
  const vits = initSherpaOnnxOfflineTtsVitsModelConfig(config.offlineTtsVitsModelConfig || {}, Module);
  const matcha = initSherpaOnnxOfflineTtsMatchaModelConfig(config.offlineTtsMatchaModelConfig || {}, Module);
  const kokoro = initSherpaOnnxOfflineTtsKokoroModelConfig(config.offlineTtsKokoroModelConfig || {}, Module);
  const zipvoice = initSherpaOnnxOfflineTtsZipvoiceModelConfig(config.offlineTtsZipvoiceModelConfig || {}, Module);
  const kitten = initSherpaOnnxOfflineTtsKittenModelConfig(config.offlineTtsKittenModelConfig || {}, Module);
  const pocket = initSherpaOnnxOfflineTtsPocketModelConfig(config.offlineTtsPocketModelConfig || {}, Module);
  const supertonic = initSherpaOnnxOfflineTtsSupertonicModelConfig(config.offlineTtsSupertonicModelConfig || {}, Module);

  const len = vits.len + matcha.len + kokoro.len + zipvoice.len + kitten.len + pocket.len + supertonic.len + (3 * 4); // + num_threads, debug, provider
  const ptr = Module._malloc(len);

  let offset = 0;
  copyHeap(Module, vits.ptr, vits.len, ptr + offset); offset += vits.len;
  copyHeap(Module, matcha.ptr, matcha.len, ptr + offset); offset += matcha.len;
  copyHeap(Module, kokoro.ptr, kokoro.len, ptr + offset); offset += kokoro.len;
  copyHeap(Module, zipvoice.ptr, zipvoice.len, ptr + offset); offset += zipvoice.len;
  copyHeap(Module, kitten.ptr, kitten.len, ptr + offset); offset += kitten.len;
  copyHeap(Module, pocket.ptr, pocket.len, ptr + offset); offset += pocket.len;
  copyHeap(Module, supertonic.ptr, supertonic.len, ptr + offset); offset += supertonic.len;

  Module.setValue(ptr + offset, config.numThreads || 1, 'i32'); offset += 4;
  Module.setValue(ptr + offset, config.debug ? 1 : 0, 'i32'); offset += 4;

  const providerLen = Module.lengthBytesUTF8(config.provider || 'cpu') + 1;
  const pBuffer = Module._malloc(providerLen);
  Module.stringToUTF8(config.provider || 'cpu', pBuffer, providerLen);
  Module.setValue(ptr + offset, pBuffer, 'i8*');

  return {
    ptr, len, buffer: pBuffer,
    vits, matcha, kokoro, zipvoice, kitten, pocket, supertonic
  };
}

// ---------------------------------------------------------
// Root Config
// ---------------------------------------------------------

function initSherpaOnnxOfflineTtsConfig(config, Module) {
  const model = initSherpaOnnxOfflineTtsModelConfig(config.offlineTtsModelConfig || {}, Module);
  
  const ruleFstsLen = Module.lengthBytesUTF8(config.ruleFsts || '') + 1;
  const ruleFarsLen = Module.lengthBytesUTF8(config.ruleFars || '') + 1;
  const n = ruleFstsLen + ruleFarsLen;
  const buffer = Module._malloc(n);
  Module.stringToUTF8(config.ruleFsts || '', buffer, ruleFstsLen);
  Module.stringToUTF8(config.ruleFars || '', buffer + ruleFstsLen, ruleFarsLen);

  const len = model.len + (4 * 4); // model + rule_fsts, rule_fars, max_num_sentences, silence_scale
  const ptr = Module._malloc(len);

  let offset = 0;
  copyHeap(Module, model.ptr, model.len, ptr + offset); offset += model.len;

  Module.setValue(ptr + offset, buffer, 'i8*'); offset += 4;
  Module.setValue(ptr + offset, buffer + ruleFstsLen, 'i8*'); offset += 4;
  Module.setValue(ptr + offset, config.maxNumSentences || 1, 'i32'); offset += 4;
  Module.setValue(ptr + offset, config.silenceScale || 0.2, 'float');

  return { ptr, len, buffer, model };
}

// ---------------------------------------------------------
// Generation Config
// ---------------------------------------------------------

function initSherpaOnnxGenerationConfig(config, Module) {
  const len = 9 * 4;
  const ptr = Module._malloc(len);

  Module.setValue(ptr + 0*4, config.silenceScale || 0.2, 'float');
  Module.setValue(ptr + 1*4, config.speed || 1.0, 'float');
  Module.setValue(ptr + 2*4, config.sid || 0, 'i32');

  let refPtr = 0;
  if (config.referenceAudio && config.referenceAudio.length > 0) {
    refPtr = Module._malloc(config.referenceAudio.length * 4);
    Module.HEAPF32.set(config.referenceAudio, refPtr / 4);
  }
  Module.setValue(ptr + 3*4, refPtr, 'i8*');
  Module.setValue(ptr + 4*4, config.referenceAudio ? config.referenceAudio.length : 0, 'i32');
  Module.setValue(ptr + 5*4, config.referenceSampleRate || 0, 'i32');

  let textPtr = 0;
  if (config.referenceText) {
    const tLen = Module.lengthBytesUTF8(config.referenceText) + 1;
    textPtr = Module._malloc(tLen);
    Module.stringToUTF8(config.referenceText, textPtr, tLen);
  }
  Module.setValue(ptr + 6*4, textPtr, 'i8*');
  Module.setValue(ptr + 7*4, config.numSteps || 5, 'i32');
  Module.setValue(ptr + 8*4, 0, 'i8*'); // extra (not fully implemented in JS yet)

  return { ptr, refPtr, textPtr };
}

function freeSherpaOnnxGenerationConfig(cfg, Module) {
  if (!cfg) return;
  if (cfg.refPtr) Module._free(cfg.refPtr);
  if (cfg.textPtr) Module._free(cfg.textPtr);
  if (cfg.ptr) Module._free(cfg.ptr);
}

// ---------------------------------------------------------
// Classes
// ---------------------------------------------------------

class OfflineTts {
  constructor(configObj, Module) {
    const config = initSherpaOnnxOfflineTtsConfig(configObj, Module);
    const handle = Module._SherpaOnnxCreateOfflineTts(config.ptr);
    freeConfig(config, Module);

    if (!handle) throw new Error("Failed to create OfflineTts handle");
    this.handle = handle;
    this.Module = Module;
    this.sampleRate = Module._SherpaOnnxOfflineTtsSampleRate(handle);
  }

  free() {
    if (this.handle) {
      this.Module._SherpaOnnxDestroyOfflineTts(this.handle);
      this.handle = 0;
    }
  }

  generate(config) {
    if (!this.handle) throw new Error('OfflineTts freed');
    const tLen = this.Module.lengthBytesUTF8(config.text) + 1;
    const tPtr = this.Module._malloc(tLen);
    this.Module.stringToUTF8(config.text, tPtr, tLen);

    const h = this.Module._SherpaOnnxOfflineTtsGenerate(this.handle, tPtr, config.sid || 0, config.speed || 1.0);
    this.Module._free(tPtr);

    if (!h) throw new Error('TTS generation failed');

    try {
      const base = h / 4;
      const sPtr = this.Module.HEAPU32[base];
      const nS = this.Module.HEAP32[base + 1];
      const sR = this.Module.HEAP32[base + 2];

      console.log(`SherpaONNX v1.4.9: Audio Handle ${h} -> ptr=${sPtr}, n=${nS}, rate=${sR}`);
      if (!sPtr || nS <= 0 || nS > 20000000) throw new Error('Invalid audio');

      const samples = new Float32Array(this.Module.HEAPF32.subarray(sPtr / 4, sPtr / 4 + nS));
      this.Module._SherpaOnnxDestroyOfflineTtsGeneratedAudio(h);
      return { samples, sampleRate: sR };
    } catch (e) {
      if (h) this.Module._SherpaOnnxDestroyOfflineTtsGeneratedAudio(h);
      throw e;
    }
  }
}

function createOfflineTts(Module, myConfig) {
  return new OfflineTts(myConfig, Module);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createOfflineTts };
}
