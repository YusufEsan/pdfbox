if (typeof window !== 'undefined') {
  window.__SHERPA_TTS_BRIDGE_VERSION__ = "1.5.0";
  console.log("%c >>> SherpaONNX Bridge v1.5.0: C-API VERIFIED <<< ", "background: #1e88e5; color: #fff; font-size: 16px; font-weight: bold;");
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
  if ('config' in config) freeConfig(config.config, Module);
  if ('matcha' in config) freeConfig(config.matcha, Module);
  if ('kokoro' in config) freeConfig(config.kokoro, Module);
  if ('zipvoice' in config) freeConfig(config.zipvoice, Module);
  if ('kitten' in config) freeConfig(config.kitten, Module);
  if ('pocket' in config) freeConfig(config.pocket, Module);
  if ('supertonic' in config) freeConfig(config.supertonic, Module);

  if (config.ptr) {
    Module._free(config.ptr);
  }
}

// 1. VITS: model, lexicon, tokens, data_dir, noiseScale, noiseScaleW, lengthScale, dictDir
function initSherpaOnnxOfflineTtsVitsModelConfig(config, Module) {
  const modelLen = Module.lengthBytesUTF8(config.model || '') + 1;
  const lexiconLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;
  const tokensLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const dataDirLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const dictDirLen = Module.lengthBytesUTF8(config.dictDir || '') + 1;

  const n = modelLen + lexiconLen + tokensLen + dataDirLen + dictDirLen;
  const buffer = Module._malloc(n);
  const len = 8 * 4;
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
  Module.setValue(ptr + 4*4, config.noiseScale || 0.667, 'float');
  Module.setValue(ptr + 5*4, config.noiseScaleW || 0.8, 'float');
  Module.setValue(ptr + 6*4, config.lengthScale || 1.0, 'float');
  Module.setValue(ptr + 7*4, buffer + offset, 'i8*'); // dictDir

  return { buffer, ptr, len };
}

// 2. Matcha: model, vocoder, lexicon, tokens, dataDir, noiseScale, lengthScale, dictDir
function initSherpaOnnxOfflineTtsMatchaModelConfig(config, Module) {
  const amLen = Module.lengthBytesUTF8(config.acousticModel || '') + 1;
  const vocLen = Module.lengthBytesUTF8(config.vocoder || '') + 1;
  const lexLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;
  const tokLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const datLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const dictLen = Module.lengthBytesUTF8(config.dictDir || '') + 1;

  const n = amLen + vocLen + lexLen + tokLen + datLen + dictLen;
  const buffer = Module._malloc(n);
  const len = 8 * 4;
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.acousticModel || '', buffer + offset, amLen); offset += amLen;
  Module.stringToUTF8(config.vocoder || '', buffer + offset, vocLen); offset += vocLen;
  Module.stringToUTF8(config.lexicon || '', buffer + offset, lexLen); offset += lexLen;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokLen); offset += tokLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, datLen); offset += datLen;
  Module.stringToUTF8(config.dictDir || '', buffer + offset, dictLen); offset += dictLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += amLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += vocLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += lexLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += tokLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += datLen;
  Module.setValue(ptr + 5*4, config.noiseScale || 1.0, 'float');
  Module.setValue(ptr + 6*4, config.lengthScale || 1.0, 'float');
  Module.setValue(ptr + 7*4, buffer + offset, 'i8*'); // dictDir

  return { buffer, ptr, len };
}

// 3. Kokoro: model, voices, tokens, dataDir, lengthScale, dictDir, lexicon, lang
function initSherpaOnnxOfflineTtsKokoroModelConfig(config, Module) {
  const modLen = Module.lengthBytesUTF8(config.model || '') + 1;
  const voiceLen = Module.lengthBytesUTF8(config.voices || '') + 1;
  const tokLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const datLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const dictLen = Module.lengthBytesUTF8(config.dictDir || '') + 1;
  const lexLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;
  const langLen = Module.lengthBytesUTF8(config.lang || '') + 1;

  const n = modLen + voiceLen + tokLen + datLen + dictLen + lexLen + langLen;
  const buffer = Module._malloc(n);
  const len = 8 * 4;
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.model || '', buffer + offset, modLen); offset += modLen;
  Module.stringToUTF8(config.voices || '', buffer + offset, voiceLen); offset += voiceLen;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokLen); offset += tokLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, datLen); offset += datLen;
  Module.stringToUTF8(config.dictDir || '', buffer + offset, dictLen); offset += dictLen;
  Module.stringToUTF8(config.lexicon || '', buffer + offset, lexLen); offset += lexLen;
  Module.stringToUTF8(config.lang || '', buffer + offset, langLen); offset += langLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += modLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += voiceLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += tokLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += datLen;
  Module.setValue(ptr + 4*4, config.lengthScale || 1.0, 'float');
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += dictLen;
  Module.setValue(ptr + 6*4, buffer + offset, 'i8*'); offset += lexLen;
  Module.setValue(ptr + 7*4, buffer + offset, 'i8*'); offset += langLen;

  return { buffer, ptr, len };
}

// 4. Kitten: mod, voice, tok, dat, lenScale
function initSherpaOnnxOfflineTtsKittenModelConfig(config, Module) {
  const modLen = Module.lengthBytesUTF8(config.model || '') + 1;
  const voiceLen = Module.lengthBytesUTF8(config.voices || '') + 1;
  const tokLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const datLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;

  const n = modLen + voiceLen + tokLen + datLen;
  const buffer = Module._malloc(n);
  const len = 5 * 4;
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.model || '', buffer + offset, modLen); offset += modLen;
  Module.stringToUTF8(config.voices || '', buffer + offset, voiceLen); offset += voiceLen;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokLen); offset += tokLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, datLen); offset += datLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += modLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += voiceLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += tokLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += datLen;
  Module.setValue(ptr + 4*4, config.lengthScale || 1.0, 'float');

  return { buffer, ptr, len };
}

// 5. Zipvoice: tok, enc, dec, voc, dat, lex, fScale, tShift, rms, gScale
function initSherpaOnnxOfflineTtsZipvoiceModelConfig(config, Module) {
  const tokLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const encLen = Module.lengthBytesUTF8(config.encoder || '') + 1;
  const decLen = Module.lengthBytesUTF8(config.decoder || '') + 1;
  const vocLen = Module.lengthBytesUTF8(config.vocoder || '') + 1;
  const datLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const lexLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;

  const n = tokLen + encLen + decLen + vocLen + datLen + lexLen;
  const buffer = Module._malloc(n);
  const len = 10 * 4;
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokLen); offset += tokLen;
  Module.stringToUTF8(config.encoder || '', buffer + offset, encLen); offset += encLen;
  Module.stringToUTF8(config.decoder || '', buffer + offset, decLen); offset += decLen;
  Module.stringToUTF8(config.vocoder || '', buffer + offset, vocLen); offset += vocLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, datLen); offset += datLen;
  Module.stringToUTF8(config.lexicon || '', buffer + offset, lexLen); offset += lexLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += tokLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += encLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += decLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += vocLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += datLen;
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += lexLen;
  Module.setValue(ptr + 6*4, config.featScale || 0.1, 'float');
  Module.setValue(ptr + 7*4, config.tShift || 0.5, 'float');
  Module.setValue(ptr + 8*4, config.targetRms || 0.1, 'float');
  Module.setValue(ptr + 9*4, config.guidanceScale || 1.0, 'float');

  return { buffer, ptr, len };
}

// 6. Pocket: lmFlow, lmMain, enc, dec, textCond, vocab, scores, cache
function initSherpaOnnxOfflineTtsPocketModelConfig(config, Module) {
  const fLen = Module.lengthBytesUTF8(config.lmFlow || '') + 1;
  const mLen = Module.lengthBytesUTF8(config.lmMain || '') + 1;
  const eLen = Module.lengthBytesUTF8(config.encoder || '') + 1;
  const dLen = Module.lengthBytesUTF8(config.decoder || '') + 1;
  const cLen = Module.lengthBytesUTF8(config.textConditioner || '') + 1;
  const vLen = Module.lengthBytesUTF8(config.vocabJson || '') + 1;
  const sLen = Module.lengthBytesUTF8(config.tokenScoresJson || '') + 1;

  const n = fLen + mLen + eLen + dLen + cLen + vLen + sLen;
  const buffer = Module._malloc(n);
  const len = 8 * 4;
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.lmFlow || '', buffer + offset, fLen); offset += fLen;
  Module.stringToUTF8(config.lmMain || '', buffer + offset, mLen); offset += mLen;
  Module.stringToUTF8(config.encoder || '', buffer + offset, eLen); offset += eLen;
  Module.stringToUTF8(config.decoder || '', buffer + offset, dLen); offset += dLen;
  Module.stringToUTF8(config.textConditioner || '', buffer + offset, cLen); offset += cLen;
  Module.stringToUTF8(config.vocabJson || '', buffer + offset, vLen); offset += vLen;
  Module.stringToUTF8(config.tokenScoresJson || '', buffer + offset, sLen); offset += sLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += fLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += mLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += eLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += dLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += cLen;
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += vLen;
  Module.setValue(ptr + 6*4, buffer + offset, 'i8*'); offset += sLen;
  Module.setValue(ptr + 7*4, config.voiceEmbeddingCacheCapacity || 50, 'i32');

  return { buffer, ptr, len };
}

// 7. Supertonic: dur, enc, vec, voc, tts, uni, style
function initSherpaOnnxOfflineTtsSupertonicModelConfig(config, Module) {
  const pLen = Module.lengthBytesUTF8(config.durationPredictor || '') + 1;
  const eLen = Module.lengthBytesUTF8(config.textEncoder || '') + 1;
  const vLen = Module.lengthBytesUTF8(config.vectorEstimator || '') + 1;
  const oLen = Module.lengthBytesUTF8(config.vocoder || '') + 1;
  const jLen = Module.lengthBytesUTF8(config.ttsJson || '') + 1;
  const uLen = Module.lengthBytesUTF8(config.unicodeIndexer || '') + 1;
  const sLen = Module.lengthBytesUTF8(config.voiceStyle || '') + 1;

  const n = pLen + eLen + vLen + oLen + jLen + uLen + sLen;
  const buffer = Module._malloc(n);
  const len = 7 * 4;
  const ptr = Module._malloc(len);

  let offset = 0;
  Module.stringToUTF8(config.durationPredictor || '', buffer + offset, pLen); offset += pLen;
  Module.stringToUTF8(config.textEncoder || '', buffer + offset, eLen); offset += eLen;
  Module.stringToUTF8(config.vectorEstimator || '', buffer + offset, vLen); offset += vLen;
  Module.stringToUTF8(config.vocoder || '', buffer + offset, oLen); offset += oLen;
  Module.stringToUTF8(config.ttsJson || '', buffer + offset, jLen); offset += jLen;
  Module.stringToUTF8(config.unicodeIndexer || '', buffer + offset, uLen); offset += uLen;
  Module.stringToUTF8(config.voiceStyle || '', buffer + offset, sLen); offset += sLen;

  offset = 0;
  Module.setValue(ptr + 0*4, buffer + offset, 'i8*'); offset += pLen;
  Module.setValue(ptr + 1*4, buffer + offset, 'i8*'); offset += eLen;
  Module.setValue(ptr + 2*4, buffer + offset, 'i8*'); offset += vLen;
  Module.setValue(ptr + 3*4, buffer + offset, 'i8*'); offset += oLen;
  Module.setValue(ptr + 4*4, buffer + offset, 'i8*'); offset += jLen;
  Module.setValue(ptr + 5*4, buffer + offset, 'i8*'); offset += uLen;
  Module.setValue(ptr + 6*4, buffer + offset, 'i8*'); offset += sLen;

  return { buffer, ptr, len };
}

// CONTAINER: VITS, numThreads, debug, provider, MATCHA, KOKORO, KITTEN, ZIP, POCKET, SUPER
function initSherpaOnnxOfflineTtsModelConfig(config, Module) {
  const vits = initSherpaOnnxOfflineTtsVitsModelConfig(config.offlineTtsVitsModelConfig || {}, Module);
  const matcha = initSherpaOnnxOfflineTtsMatchaModelConfig(config.offlineTtsMatchaModelConfig || {}, Module);
  const kokoro = initSherpaOnnxOfflineTtsKokoroModelConfig(config.offlineTtsKokoroModelConfig || {}, Module);
  const kitten = initSherpaOnnxOfflineTtsKittenModelConfig(config.offlineTtsKittenModelConfig || {}, Module);
  const zipvoice = initSherpaOnnxOfflineTtsZipvoiceModelConfig(config.offlineTtsZipvoiceModelConfig || {}, Module);
  const pocket = initSherpaOnnxOfflineTtsPocketModelConfig(config.offlineTtsPocketModelConfig || {}, Module);
  const supertonic = initSherpaOnnxOfflineTtsSupertonicModelConfig(config.offlineTtsSupertonicModelConfig || {}, Module);

  const totalLen = vits.len + 3*4 + matcha.len + kokoro.len + kitten.len + zipvoice.len + pocket.len + supertonic.len;
  const ptr = Module._malloc(totalLen);

  const providerLen = Module.lengthBytesUTF8(config.provider || 'cpu') + 1;
  const pBuffer = Module._malloc(providerLen);
  Module.stringToUTF8(config.provider || 'cpu', pBuffer, providerLen);

  let offset = 0;
  copyHeap(Module, vits.ptr, vits.len, ptr + offset); offset += vits.len;
  
  Module.setValue(ptr + offset, config.numThreads || 1, 'i32'); offset += 4;
  Module.setValue(ptr + offset, config.debug ? 1 : 0, 'i32'); offset += 4;
  Module.setValue(ptr + offset, pBuffer, 'i8*'); offset += 4;

  copyHeap(Module, matcha.ptr, matcha.len, ptr + offset); offset += matcha.len;
  copyHeap(Module, kokoro.ptr, kokoro.len, ptr + offset); offset += kokoro.len;
  copyHeap(Module, kitten.ptr, kitten.len, ptr + offset); offset += kitten.len;
  copyHeap(Module, zipvoice.ptr, zipvoice.len, ptr + offset); offset += zipvoice.len;
  copyHeap(Module, pocket.ptr, pocket.len, ptr + offset); offset += pocket.len;
  copyHeap(Module, supertonic.ptr, supertonic.len, ptr + offset); offset += supertonic.len;

  return { ptr, len: totalLen, buffer: pBuffer, vits, matcha, kokoro, kitten, zipvoice, pocket, supertonic };
}

// ROOT: model, rule_fsts, max_num_sentences, rule_fars, silence_scale
function initSherpaOnnxOfflineTtsConfig(config, Module) {
  const model = initSherpaOnnxOfflineTtsModelConfig(config.offlineTtsModelConfig || {}, Module);
  
  const fstLen = Module.lengthBytesUTF8(config.ruleFsts || '') + 1;
  const farLen = Module.lengthBytesUTF8(config.ruleFars || '') + 1;
  const buffer = Module._malloc(fstLen + farLen);
  Module.stringToUTF8(config.ruleFsts || '', buffer, fstLen);
  Module.stringToUTF8(config.ruleFars || '', buffer + fstLen, farLen);

  const totalLen = model.len + 4*4;
  const ptr = Module._malloc(totalLen);

  let offset = 0;
  copyHeap(Module, model.ptr, model.len, ptr + offset); offset += model.len;
  
  Module.setValue(ptr + offset, buffer, 'i8*'); offset += 4;
  Module.setValue(ptr + offset, config.maxNumSentences || 1, 'i32'); offset += 4;
  Module.setValue(ptr + offset, buffer + fstLen, 'i8*'); offset += 4;
  Module.setValue(ptr + offset, config.silenceScale || 0.2, 'float');

  return { ptr, len: totalLen, buffer, model };
}

class OfflineTts {
  constructor(configObj, Module) {
    const config = initSherpaOnnxOfflineTtsConfig(configObj, Module);
    const handle = Module._SherpaOnnxCreateOfflineTts(config.ptr);
    freeConfig(config, Module);
    if (!handle) throw new Error("OfflineTts creation failed");
    this.handle = handle;
    this.Module = Module;
    this.sampleRate = Module._SherpaOnnxOfflineTtsSampleRate(handle);
  }
  free() { if (this.handle) this.Module._SherpaOnnxDestroyOfflineTts(this.handle); this.handle = 0; }
  generate(config) {
    const tLen = this.Module.lengthBytesUTF8(config.text) + 1;
    const tPtr = this.Module._malloc(tLen);
    this.Module.stringToUTF8(config.text, tPtr, tLen);
    const h = this.Module._SherpaOnnxOfflineTtsGenerate(this.handle, tPtr, config.sid || 0, config.speed || 1.0);
    this.Module._free(tPtr);
    if (!h) throw new Error('TTS failed');
    const base = h / 4;
    const sPtr = this.Module.HEAPU32[base];
    const nS = this.Module.HEAP32[base + 1];
    const sR = this.Module.HEAP32[base + 2];
    const samples = new Float32Array(this.Module.HEAPF32.subarray(sPtr / 4, sPtr / 4 + nS));
    this.Module._SherpaOnnxDestroyOfflineTtsGeneratedAudio(h);
    return { samples, sampleRate: sR };
  }
}

function createOfflineTts(Module, myConfig) { return new OfflineTts(myConfig, Module); }
if (typeof module !== 'undefined' && module.exports) module.exports = { createOfflineTts };
