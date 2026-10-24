// Runs only in an isolated, network-blocked WebView; never in the workspace.
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

const job = window.__foodImageJob;
const send = value => window.ReactNativeWebView.postMessage(JSON.stringify({ id: job.id, ...value }));
const image = new Image();
image.onerror = () => send({error:'This photo could not be read. Choose a JPEG or take another photo.'});
image.onload = () => {
  try {
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 60000000)
      throw Error('Choose a smaller photo.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, (job.mode === 'barcode' ? 2048 : 1152) / Math.max(image.naturalWidth,image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    context.fillStyle='#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
    if(job.mode==='barcode') {
      const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A]], [DecodeHintType.TRY_HARDER,true]]);
      const reader = new BrowserMultiFormatReader(hints);
      let code='';
      for(let turn=0;turn<4&&!code;turn++) {
        const rotated=document.createElement('canvas');
        rotated.width=turn%2?canvas.height:canvas.width; rotated.height=turn%2?canvas.width:canvas.height;
        const ctx=rotated.getContext('2d'); ctx.translate(rotated.width/2,rotated.height/2);ctx.rotate(turn*Math.PI/2);ctx.drawImage(canvas,-canvas.width/2,-canvas.height/2);
        try { code=reader.decodeFromCanvas(rotated).getText(); } catch {}
      }
      if(!code) throw Error('The barcode was not clear enough. Try a closer photo or type the printed number.');
      send({code});
    } else {
      let photo=canvas.toDataURL('image/jpeg',0.82);
      if(photo.length>900000) photo=canvas.toDataURL('image/jpeg',0.55);
      if(photo.length>900000) photo=canvas.toDataURL('image/jpeg',0.3);
      if(photo.length>900000) throw Error('This photo is too large. Take a closer crop of the food.');
      send({photo});
    }
  } catch(error) { send({error:error.message||'This photo could not be processed.'}); }
};
image.src=job.photo;
