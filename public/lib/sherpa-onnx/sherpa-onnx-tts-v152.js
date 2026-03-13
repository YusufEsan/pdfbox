if (typeof window !== 'undefined') {
  window.__SHERPA_TTS_BRIDGE_VERSION__ = "1.5.2";
  console.log("%c >>> SherpaONNX Bridge v1.5.2: TRACED ALIGNMENT <<< ", "background: #1e88e5; color: #fff; font-size: 16px; font-weight: bold;");
}

function copyHeap(Module, src, len, dst) {
  if (Module._CopyHeap) {
    Module._CopyHeap(src, len, dst);
  } else {
    Module.HEAPU8.set(Module.HEAPU8.subarray(src, src + len), dst);
  }
}

function freeConfig(config, Module) {
  if ('buffer' in config) Module._free(config.buffer);
  if ('vits' in config) freeConfig(config.vits, Module);
  if ('matcha' in config) freeConfig(config.matcha, Module);
  if ('kokoro' in config) freeConfig(config.kokoro, Module);
  if ('zipvoice' in config) freeConfig(config.zipvoice, Module);
  if ('kitten' in config) freeConfig(config.kitten, Module);
  if ('pocket' in config) freeConfig(config.pocket, Module);
  if ('supertonic' in config) freeConfig(config.supertonic, Module);
  if (config.ptr) Module._free(config.ptr);
}

function initSherpaOnnxOfflineTtsVitsModelConfig(config, Module) {
  const modelLen = Module.lengthBytesUTF8(config.model || '') + 1;
  const lexiconLen = Module.lengthBytesUTF8(config.lexicon || '') + 1;
  const tokensLen = Module.lengthBytesUTF8(config.tokens || '') + 1;
  const dataDirLen = Module.lengthBytesUTF8(config.dataDir || '') + 1;
  const dictDirLen = Module.lengthBytesUTF8(config.dictDir || '') + 1;

  const n = modelLen + lexiconLen + tokensLen + dataDirLen + dictDirLen;
  const buffer = Module._malloc(n);
  const ptr = Module._malloc(32);

  let offset = 0;
  Module.stringToUTF8(config.model || '', buffer + offset, modelLen); offset += modelLen;
  Module.stringToUTF8(config.lexicon || '', buffer + offset, lexiconLen); offset += lexiconLen;
  Module.stringToUTF8(config.tokens || '', buffer + offset, tokensLen); offset += tokensLen;
  Module.stringToUTF8(config.dataDir || '', buffer + offset, dataDirLen); offset += dataDirLen;
  const dictDirOffset = offset;
  Module.stringToUTF8(config.dictDir || '', buffer + offset, dictDirLen);

  offset = 0;
  Module.setValue(ptr + 0, buffer + 0, 'i8*');
  Module.setValue(ptr + 4, buffer + modelLen, 'i8*');
  Module.setValue(ptr + 8, buffer + modelLen + lexiconLen, 'i8*');
  Module.setValue(ptr + 12, buffer + modelLen + lexiconLen + tokensLen, 'i8*');
  Module.setValue(ptr + 16, config.noiseScale || 0.667, 'float');
  Module.setValue(ptr + 20, config.noiseScaleW || 0.8, 'float');
  Module.setValue(ptr + 24, config.lengthScale || 1.0, 'float');
  Module.setValue(ptr + 28, buffer + dictDirOffset, 'i8*');

  console.log(`[TRACED] VITS Struct (ptr=${ptr}): model=${config.model}, lexicon=${config.lexicon}, tokens=${config.tokens}, dataDir=${config.dataDir}`);
  return { buffer, ptr, len: 32 };
}

function initSherpaOnnxOfflineTtsModelConfig(config, Module) {
  const vits = initSherpaOnnxOfflineTtsVitsModelConfig(config.offlineTtsVitsModelConfig || {}, Module);
  const matchaPtr = Module._malloc(32); // Placeholder
  const kokoroPtr = Module._malloc(32);
  const kittenPtr = Module._malloc(20);
  const zipvoicePtr = Module._malloc(40);
  const pocketPtr = Module._malloc(32);
  const supertonicPtr = Module._malloc(28);

  const totalLen = vits.len + 3*4 + 32 + 32 + 20 + 40 + 32 + 28;
  const ptr = Module._malloc(totalLen);
  
  const providerLen = Module.lengthBytesUTF8(config.provider || 'cpu') + 1;
  const pBuffer = Module._malloc(providerLen);
  Module.stringToUTF8(config.provider || 'cpu', pBuffer, providerLen);

  let offset = 0;
  copyHeap(Module, vits.ptr, 32, ptr + offset); offset += 32;
  
  Module.setValue(ptr + offset, config.numThreads || 1, 'i32'); offset += 4;
  Module.setValue(ptr + offset, config.debug ? 1 : 0, 'i32'); offset += 4;
  Module.setValue(ptr + offset, pBuffer, 'i8*'); offset += 4;

  console.log(`[TRACED] ModelConfig Struct: vits@0, threads@32=${config.numThreads}, debug@36=${config.debug}, provider@40=${config.provider}`);

  // Fill remaining as zeroed memory
  Module.HEAPU8.fill(0, ptr + offset, ptr + totalLen);

  return { ptr, len: totalLen, buffer: pBuffer, vits };
}

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

  console.log(`[TRACED] RootConfig Struct: model@0, ruleFsts@${model.len}, maxSentences@${model.len+4}, silence@${model.len+12}`);

  return { ptr, len: totalLen, buffer, model };
}

class OfflineTts {
  constructor(configObj, Module) {
    const config = initSherpaOnnxOfflineTtsConfig(configObj, Module);
    console.log(`[TRACED] Calling _SherpaOnnxCreateOfflineTts with ptr=${config.ptr}`);
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
