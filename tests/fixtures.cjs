// Synthetic structural fixture, not a real playable or copyrighted game map.
const fflate=require('../src/vendor/save-zip.js');
exports.mapBytes=()=>{const data=new Uint8Array(10000);const view=new DataView(data.buffer);view.setUint32(0,28,true);data[4]=1;view.setUint32(5,36,true);return fflate.gzipSync(data);};
