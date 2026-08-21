import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, X, XCircle, ZoomIn, ZoomOut } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
type ToastApi = { show:(message:string,kind?:ToastKind)=>void };
const ToastContext=createContext<ToastApi>({show:()=>undefined});
export const useToast=()=>useContext(ToastContext);

export function ToastProvider({children}:{children:ReactNode}){
  const [toast,setToast]=useState<{id:number;message:string;kind:ToastKind}|null>(null);
  const show=useCallback((message:string,kind:ToastKind='success')=>{
    if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
    setToast({id:Date.now(),message,kind});
  },[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),3500);return()=>clearTimeout(timer);},[toast]);
  return <ToastContext.Provider value={{show}}>{children}{toast?<div role="status" className={`fixed right-4 top-4 z-[100] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-xl ${toast.kind==='error'?'border-red-200 bg-red-50 text-red-800':toast.kind==='info'?'border-blue-200 bg-blue-50 text-blue-800':'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{toast.kind==='error'?<XCircle size={20}/>:<CheckCircle2 size={20}/>}<span className="text-sm font-semibold">{toast.message}</span><button aria-label="Kapat" onClick={()=>setToast(null)}><X size={17}/></button></div>:null}</ToastContext.Provider>;
}

export function ConfirmDialog({open,title,message,confirmLabel='Onayla',danger=false,onConfirm,onClose}:{open:boolean;title:string;message:string;confirmLabel?:string;danger?:boolean;onConfirm:()=>void;onClose:()=>void}){
  if(!open)return null;
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-3 text-sm text-slate-600">{message}</p><div className="mt-6 flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Vazgeç</button><button className={danger?'btn-danger':'btn-primary'} onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}

export function InfoDialog({open,title,children,onClose}:{open:boolean;title:string;children:ReactNode;onClose:()=>void}){
  if(!open)return null;
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div role="dialog" aria-modal="true" aria-labelledby="info-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="info-dialog-title" className="text-xl font-bold text-slate-900">{title}</h2><div className="mt-3 text-sm text-slate-600">{children}</div><div className="mt-6 flex justify-end"><button className="btn-primary" onClick={onClose}>Tamam</button></div></div></div>;
}

export function OverflowMenu({children,label='İşlemler'}:{children:ReactNode;label?:string}){
  const [open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const close=(e:MouseEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false)};addEventListener('mousedown',close);return()=>removeEventListener('mousedown',close)},[]);
  return <div className="relative" ref={ref}><button aria-label={label} className="icon-button text-xl font-bold" onClick={()=>setOpen(x=>!x)}>⋮</button>{open?<div className="absolute right-0 z-30 mt-2 min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl" onClick={()=>setOpen(false)}>{children}</div>:null}</div>;
}

export function MenuButton({children,danger=false,onClick}:{children:ReactNode;danger?:boolean;onClick:()=>void}){return <button className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${danger?'text-red-700 hover:bg-red-50':'text-slate-700 hover:bg-slate-100'}`} onClick={onClick}>{children}</button>}

export function ImageLightbox({url,alt,onClose}:{url:string;alt:string;onClose:()=>void}){
  const [scale,setScale]=useState(1);const [pos,setPos]=useState({x:0,y:0});const drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
  useEffect(()=>{const key=(e:KeyboardEvent)=>e.key==='Escape'&&onClose();addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[onClose]);
  const zoom=(next:number)=>{const value=Math.min(4,Math.max(1,next));setScale(value);if(value===1)setPos({x:0,y:0})};
  return <div className="fixed inset-0 z-[95] overflow-hidden bg-slate-950/90"
    onPointerMove={e=>{if(!drag.current||scale===1)return;setPos({x:drag.current.px+e.clientX-drag.current.x,y:drag.current.py+e.clientY-drag.current.y})}}
    onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
    <div className="absolute right-4 top-4 z-10 flex gap-2"><button className="icon-button bg-white" onClick={()=>zoom(scale+.25)}><ZoomIn/></button><button className="icon-button bg-white" onClick={()=>zoom(scale-.25)}><ZoomOut/></button><button className="icon-button bg-white" onClick={onClose}><X/></button></div>
    <div className="grid h-full w-full place-items-center p-6"><img src={url} alt={alt} draggable={false} className={`max-h-full max-w-full select-none object-contain ${scale>1?'cursor-grab touch-none':'cursor-default'}`} style={{transform:`translate(${pos.x}px,${pos.y}px) scale(${scale})`}}
      onPointerDown={e=>{if(scale>1){e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,px:pos.x,py:pos.y}}}}/></div>
  </div>;
}
