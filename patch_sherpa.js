const fs = require('fs');
const file = 'public/lib/sherpa-onnx/sherpa-onnx-wasm-main-tts.js';
let content = fs.readFileSync(file, 'utf8');
const startMatch = '(function(){if(Module["ENVIRONMENT_IS_PTHREAD"]';
const endMatch = '})})();';

const startIndex = content.indexOf(startMatch);
if (startIndex !== -1) {
    const endIndex = content.indexOf(endMatch, startIndex);
    if (endIndex !== -1) {
        const toRemove = content.substring(startIndex, endIndex + endMatch.length);
        content = content.replace(toRemove, '');
        fs.writeFileSync(file, content);
        console.log('Successfully patched sherpa-onnx-wasm-main-tts.js');
    } else {
        console.log('End match not found.');
    }
} else {
    console.log('Start match not found.');
}
