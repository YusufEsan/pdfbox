(function() {
  if (typeof window !== 'undefined') {
    window.__SHERPA_TTS_BRIDGE_VERSION__ = "1.9.9";
    console.log("%c >>> SherpaONNX Bridge v1.9.9: TEXT TRACKING AND HIGHLIGHT ALIGNMENT <<< ", "background: #1e88e5; color: #fff; font-size: 16px; font-weight: bold;");
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
    const ptr = Module._malloc(32); // 8 * 4

    let offset = 0;
    Module.stringToUTF8(config.model || '', buffer + offset, modelLen); offset += modelLen;
    Module.stringToUTF8(config.lexicon || '', buffer + offset, lexiconLen); offset += lexiconLen;
    Module.stringToUTF8(config.tokens || '', buffer + offset, tokensLen); offset += tokensLen;
    Module.stringToUTF8(config.dataDir || '', buffer + offset, dataDirLen); offset += dataDirLen;
    const dictDirOffset = offset;
    Module.stringToUTF8(config.dictDir || '', buffer + offset, dictDirLen);

    Module.setValue(ptr + 0, buffer + 0, 'i8*');
    Module.setValue(ptr + 4, buffer + modelLen, 'i8*');
    Module.setValue(ptr + 8, buffer + modelLen + lexiconLen, 'i8*');
    Module.setValue(ptr + 12, buffer + modelLen + lexiconLen + tokensLen, 'i8*');
    Module.setValue(ptr + 16, config.noiseScale || 0.667, 'float');
    Module.setValue(ptr + 20, config.noiseScaleW || 0.8, 'float');
    Module.setValue(ptr + 24, config.lengthScale || 1.0, 'float');
    Module.setValue(ptr + 28, buffer + dictDirOffset, 'i8*');

    console.log(`[TRACED] VITS Struct (32): model=${config.model}`);
    return { buffer, ptr, len: 32 };
  }

  function initSherpaOnnxOfflineTtsModelConfig(config, Module) {
    const vits = initSherpaOnnxOfflineTtsVitsModelConfig(config.offlineTtsVitsModelConfig || {}, Module);
    const matchaLen = 32;
    const kokoroLen = 32;
    const kittenLen = 20; // VERIFIED: model, voices, tokens, dataDir, lengthScale
    const zipLen = 40;
    const pocketLen = 32;
    const supertonicLen = 28;

    const totalLen = vits.len + 3*4 + matchaLen + kokoroLen + kittenLen + zipLen + pocketLen + supertonicLen;
    const ptr = Module._malloc(totalLen);
    Module.HEAPU8.fill(0, ptr, ptr + totalLen);

    const pLen = Module.lengthBytesUTF8(config.provider || 'cpu') + 1;
    const pBuf = Module._malloc(pLen);
    Module.stringToUTF8(config.provider || 'cpu', pBuf, pLen);

    let offset = 0;
    copyHeap(Module, vits.ptr, vits.len, ptr + offset); offset += vits.len;
    Module.setValue(ptr + offset, config.numThreads || 1, 'i32'); offset += 4;
    Module.setValue(ptr + offset, config.debug ? 1 : 0, 'i32'); offset += 4;
    Module.setValue(ptr + offset, pBuf, 'i8*'); offset += 4;
    
    // Skip empty sub-configs (Matcha=32, Kokoro=32, Kitten=20, Zip=40, Pocket=32, Supertonic=28)
    // they are already zero-filled.

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
    Module.HEAPU8.fill(0, ptr, ptr + totalLen);

    let offset = 0;
    copyHeap(Module, model.ptr, model.len, ptr + offset); offset += model.len;
    Module.setValue(ptr + offset, buf, 'i8*'); offset += 4;
    Module.setValue(ptr + offset, config.maxNumSentences || 1, 'i32'); offset += 4;
    Module.setValue(ptr + offset, buf + fLen, 'i8*'); offset += 4;
    Module.setValue(ptr + offset, config.silenceScale || 0.2, 'float');

    console.log(`[TRACED] OfflineTtsConfig Total size: ${totalLen} bytes (Model: ${model.len})`);
    return { ptr, len: totalLen, buffer: buf, model };
  }

  class OfflineTts {
    constructor(configObj, Module) {
      if (window.__SHERPA_CREATING__) {
          console.warn("SherpaONNX: Concurrent instance creation blocked.");
          throw new Error("Concurrent instance creation");
      }
      window.__SHERPA_CREATING__ = true;
      try {
          const config = initSherpaOnnxOfflineTtsConfig(configObj, Module);
          console.log("SherpaONNX: Handing control over to WASM Core (_SherpaOnnxCreateOfflineTts)...");
          const handle = Module._SherpaOnnxCreateOfflineTts(config.ptr);
          freeConfig(config, Module);
          if (!handle) throw new Error("OfflineTts creation failed (Handle is null)");
          this.handle = handle;
          this.Module = Module;
          this.sampleRate = Module._SherpaOnnxOfflineTtsSampleRate(handle);
          console.log(`SherpaONNX: Engine initialized. Sample Rate: ${this.sampleRate}`);
      } finally {
          window.__SHERPA_CREATING__ = false;
      }
    }
    free() { if (this.handle) this.Module._SherpaOnnxDestroyOfflineTts(this.handle); this.handle = 0; }
    generate(config) {
      if (!this.handle) throw new Error('OfflineTts has been freed');
      const tLen = this.Module.lengthBytesUTF8(config.text) + 1;
      const tPtr = this.Module._malloc(tLen);
      this.Module.stringToUTF8(config.text, tPtr, tLen);
      console.log(`[TRACED] Generating (${tLen} bytes): "${config.text.substring(0, 30)}..."`);
      const h = this.Module._SherpaOnnxOfflineTtsGenerate(this.handle, tPtr, config.sid || 0, config.speed || 1.0);
      this.Module._free(tPtr);
      if (!h) throw new Error('TTS failed (WASM returned null handle)');
      const base = h / 4;
      const sPtr = this.Module.HEAPU32[base];
      const nS = this.Module.HEAP32[base + 1];
      const sR = this.Module.HEAP32[base + 2];
      const samples = new Float32Array(this.Module.HEAPF32.subarray(sPtr / 4, sPtr / 4 + nS));
      const result = { samples: new Float32Array(samples), sampleRate: sR };
      this.Module._SherpaOnnxDestroyOfflineTtsGeneratedAudio(h);
      return result;
    }
  }

  window.createOfflineTts = function(Module, myConfig) { return new OfflineTts(myConfig, Module); };
})();
