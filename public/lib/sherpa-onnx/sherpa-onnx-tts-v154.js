(function() {
  if (typeof window !== 'undefined') {
    window.__SHERPA_TTS_BRIDGE_VERSION__ = "1.5.4";
    console.log("%c >>> SherpaONNX Bridge v1.5.4: ASSET ALIGNED <<< ", "background: #1e88e5; color: #fff; font-size: 16px; font-weight: bold;");
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

    console.log(`[TRACED] VITS Struct: model=${config.model}, lexicon=${config.lexicon}, tokens=${config.tokens}, dataDir=${config.dataDir}`);
    return { buffer, ptr, len: 32 };
  }

  function initSherpaOnnxOfflineTtsModelConfig(config, Module) {
    const vits = initSherpaOnnxOfflineTtsVitsModelConfig(config.offlineTtsVitsModelConfig || {}, Module);
    const totalLen = vits.len + 3*4 + 32 + 32 + 20 + 40 + 32 + 28;
    const ptr = Module._malloc(totalLen);
    const pLen = Module.lengthBytesUTF8(config.provider || 'cpu') + 1;
    const pBuf = Module._malloc(pLen);
    Module.stringToUTF8(config.provider || 'cpu', pBuf, pLen);

    let offset = 0;
    copyHeap(Module, vits.ptr, 32, ptr + offset); offset += 32;
    Module.setValue(ptr + offset, config.numThreads || 1, 'i32'); offset += 4;
    Module.setValue(ptr + offset, config.debug ? 1 : 0, 'i32'); offset += 4;
    Module.setValue(ptr + offset, pBuf, 'i8*');

    Module.HEAPU8.fill(0, ptr + offset + 4, ptr + totalLen);
    return { ptr, len: totalLen, buffer: pBuf, vits };
  }

  function initSherpaOnnxOfflineTtsConfig(config, Module) {
    const model = initSherpaOnnxOfflineTtsModelConfig(config.offlineTtsModelConfig || {}, Module);
    const fLen = Module.lengthBytesUTF8(config.ruleFsts || '') + 1;
    const frLen = Module.lengthBytesUTF8(config.ruleFars || '') + 1;
    const buf = Module._malloc(fLen + frLen);
    Module.stringToUTF8(config.ruleFsts || '', buf, fLen);
    Module.stringToUTF8(config.ruleFars || '', buf + fLen, frLen);

    const totalLen = model.len + 4*4;
    const ptr = Module._malloc(totalLen);
    let offset = 0;
    copyHeap(Module, model.ptr, model.len, ptr + offset); offset += model.len;
    Module.setValue(ptr + offset, buf, 'i8*'); offset += 4;
    Module.setValue(ptr + offset, config.maxNumSentences || 1, 'i32'); offset += 4;
    Module.setValue(ptr + offset, buf + fLen, 'i8*'); offset += 4;
    Module.setValue(ptr + offset, config.silenceScale || 0.2, 'float');

    return { ptr, len: totalLen, buffer: buf, model };
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

  window.createOfflineTts = function(Module, myConfig) { return new OfflineTts(myConfig, Module); };
})();
