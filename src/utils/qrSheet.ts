import QRCode from 'qrcode';

export async function createQrSheet(url:string,pin:string){
  const qr=await QRCode.toDataURL(url,{width:720,margin:2,errorCorrectionLevel:'H',color:{dark:'#0f2344',light:'#ffffff'}});
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1120;
  const context=canvas.getContext('2d');if(!context)throw new Error('QR çıktısı oluşturulamadı.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  context.fillStyle='#0f2344';context.textAlign='center';context.font='bold 42px sans-serif';context.fillText('TechFix Sayaç Bildirimi',450,70);
  const image=new Image();image.src=qr;await image.decode();context.drawImage(image,90,100,720,720);
  context.font='24px sans-serif';context.fillStyle='#475569';context.fillText('QR kodu okutun veya fallback şifreyi kullanın',450,875);
  context.font='bold 58px monospace';context.fillStyle='#0f2344';context.fillText(pin,450,955);
  context.font='18px sans-serif';context.fillStyle='#64748b';context.fillText('Bu bilgileri yalnız yetkili teknikerlerle paylaşın.',450,1020);
  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl:string,name:string){const link=document.createElement('a');link.href=dataUrl;link.download=name;link.click()}
