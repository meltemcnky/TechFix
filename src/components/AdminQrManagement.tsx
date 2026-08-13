import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Download, 
  Printer, 
  Globe, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  ExternalLink,
  X,
  FileCode,
  FileText,
  Info,
  Laptop,
  Wifi
} from 'lucide-react';
import { ActiveTab } from '../types';
import { getUniversalQrTargetUrl, isLocalhostUrl } from '../config/appConfig';
import { generateQrPdf } from '../utils/pdfQrExporter';

interface AdminQrManagementProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const AdminQrManagement: React.FC<AdminQrManagementProps> = ({ setActiveTab }) => {
  // Mode selection: true = Production Target (VITE_PUBLIC_APP_URL), false = Development/LAN Target
  const [useProduction, setUseProduction] = useState<boolean>(true);
  const [customLanIp, setCustomLanIp] = useState<string>('');

  const { qrTargetUrl, config, error } = getUniversalQrTargetUrl(useProduction, customLanIp);

  const [pngDataUrl, setPngDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  useEffect(() => {
    if (qrTargetUrl) {
      generateQrCodes(qrTargetUrl);
    } else {
      setPngDataUrl('');
      setSvgString('');
    }
  }, [qrTargetUrl, useProduction, customLanIp]);

  const generateQrCodes = async (targetUrl: string) => {
    setIsGenerating(true);

    try {
      // Generate High-Res 1024x1024 PNG Data URL
      const pngUrl = await QRCode.toDataURL(targetUrl, {
        width: 1024,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0B0F17',
          light: '#FFFFFF'
        }
      });
      setPngDataUrl(pngUrl);

      // Generate Vector SVG String
      const svg = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0B0F17',
          light: '#FFFFFF'
        }
      });
      setSvgString(svg);

    } catch (err: any) {
      console.error('QR Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPng = () => {
    if (!pngDataUrl) return;
    const link = document.createElement('a');
    link.href = pngDataUrl;
    link.download = `TechFix_Tek_Ortak_QR_${useProduction ? 'Production' : 'Development'}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TechFix_Tek_Ortak_QR_${useProduction ? 'Production' : 'Development'}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!qrTargetUrl) return;
    setIsGeneratingPdf(true);
    try {
      await generateQrPdf(qrTargetUrl, useProduction);
    } catch (err) {
      console.error('PDF Generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in py-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Teknik QR Kod Yönetimi</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold text-xs border border-brand-500/30">
              Tek Ortak QR Sistemi
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Medeniyet Teknopark genelinde panolara asılacak tek ortak QR kodu yönetin, PNG/SVG/PDF indirin.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={!qrTargetUrl}
            className="px-4 py-2.5 rounded-xl gradient-accent text-white text-xs font-bold shadow-glow-brand flex items-center space-x-2 hover:opacity-95 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>A4 Baskı Afişini Aç</span>
          </button>
        </div>
      </div>

      {/* Target Environment Switcher & Status Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hedef Ortam ve URL Yapılandırması</h3>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setUseProduction(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                useProduction
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Production QR (Canlı Domain)</span>
            </button>

            <button
              onClick={() => setUseProduction(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                !useProduction
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Yerel / LAN Test QR (Mobil Wi-Fi)</span>
            </button>
          </div>
        </div>

        {/* Target URL Status Banner (Explicitly Required Requirement #6) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider">QR Hedef Adresi:</span>
            {qrTargetUrl ? (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                !isLocalhostUrl(qrTargetUrl) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {!isLocalhostUrl(qrTargetUrl) ? '✅ Production URL' : '⚠️ Localhost / LAN Test URL'}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ❌ Production URL Tanımlanmadı
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between gap-3">
            {qrTargetUrl ? (
              <span className="text-brand-300 font-bold truncate text-sm">{qrTargetUrl}</span>
            ) : (
              <span className="text-rose-400 font-bold italic">Production adresi henüz tanımlanmadı. QR kod oluşturulamaz.</span>
            )}

            {qrTargetUrl && (
              <a
                href={qrTargetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-slate-400 hover:text-white flex-shrink-0"
                title="Hedef Adresi Yeni Sekmede Test Et"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Development Mode LAN IP Mobile Wi-Fi Input */}
        {!useProduction && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3">
            <div className="flex items-center space-x-2 font-bold text-amber-300">
              <Wifi className="w-4 h-4 text-amber-400" />
              <span>Fiziksel Telefon İle Wi-Fi Üzerinden Test Etme Rehberi:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              Telefonunuzdan QR kod okuttuğunuzda bilgisayarınızdaki yerele ulaşabilmesi için telefon ve bilgisayarınızın <strong>aynı Wi-Fi ağında</strong> olması gerekir. <code>localhost</code> adresi yerine bilgisayarınızın yerel IP adresini (Örn: <code>192.168.1.45:3000</code>) girerek üretilen QR kodu telefonunuzla test edebilirsiniz.
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-bold flex-shrink-0">Yerel LAN IP Adresiniz:</span>
              <input
                type="text"
                value={customLanIp}
                onChange={(e) => setCustomLanIp(e.target.value)}
                placeholder="Örn: 192.168.1.45:3000 veya http://192.168.1.45:3000"
                className="flex-1 bg-slate-900 border border-amber-500/40 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        )}

        {/* Strict Production Warning if VITE_PUBLIC_APP_URL is not configured */}
        {useProduction && error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-2 animate-fade-in">
            <div className="flex items-center space-x-2 font-bold text-rose-300 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              Yanlışlıkla <code>localhost</code> adresine basılı QR üretilmesini önlemek amacıyla, üretim modunda QR kod oluşturulması engellenmiştir.
            </p>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/40 text-[11px] text-slate-300 space-y-1 font-mono">
              <p className="text-amber-300 font-sans font-bold">Production URL Nasıl Eklenir?</p>
              <p>Proje kök klasöründeki <code>.env</code> dosyasına canlı domaininizi ekleyin:</p>
              <p className="text-emerald-400 font-bold">VITE_PUBLIC_APP_URL=https://techfix.medeniyetteknopark.com</p>
            </div>
          </div>
        )}

        {/* Success Info if Production is Configured */}
        {useProduction && config.isProductionConfigured && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Production alan adı doğrulandı: <strong>{config.productionUrl}</strong></span>
          </div>
        )}
      </div>

      {/* Main QR Display & Export Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: QR Code Preview Card */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-slate-800 text-center space-y-6 flex flex-col items-center justify-center">
          
          <div className="flex items-center space-x-2">
            <QrCode className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {useProduction ? 'Production QR Önizlemesi' : 'Yerel / LAN Test QR Önizlemesi'}
            </span>
          </div>

          <div className="relative p-6 bg-white rounded-3xl border-4 border-slate-800 shadow-2xl space-y-2 group">
            {isGenerating ? (
              <div className="w-64 h-64 flex items-center justify-center text-slate-900 font-bold text-xs">
                QR Kod Oluşturuluyor...
              </div>
            ) : pngDataUrl ? (
              <img src={pngDataUrl} alt="Teknik QR Kodu" className="w-64 h-64 mx-auto object-contain" />
            ) : (
              <div className="w-64 h-64 flex flex-col items-center justify-center text-rose-500 font-bold text-xs p-4 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
                <span>Production URL Tanımsız</span>
                <span className="text-[10px] text-slate-500 font-normal">QR Kod Üretilemedi</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-600 font-mono">
              Baskı Kalitesi: 1024 x 1024 px (Hata Toleransı %30)
            </div>
          </div>

          <div className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Bu QR kod taranarak Teknopark kiracıları tarafından <strong>hesap gerektirmeden</strong> doğrudan halka açık arıza bildirim formuna ulaşılır.
          </div>
        </div>

        {/* Right Column: Download & Action Cards (PNG, SVG, PDF) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Dışa Aktarma ve İndirme Formatları</span>
          </h3>

          {/* PNG Download Button Box */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">PNG Görsel Formatı (1024x1024 px)</h4>
                <p className="text-xs text-slate-400">Yüksek çözünürlüklü dijital mecralar ve tasarım programları için PNG.</p>
              </div>
              <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-mono rounded">.PNG</span>
            </div>

            <button
              onClick={handleDownloadPng}
              disabled={!pngDataUrl}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-brand transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              <span>Yüksek Çözünürlüklü PNG İndir</span>
            </button>
          </div>

          {/* SVG Vector Download Button Box */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">SVG Vektörel Baskı Formatı</h4>
                <p className="text-xs text-slate-400">Matbaa, tabela, pleksi ve büyük boy posterler için çözünürlüğü bozulmayan SVG.</p>
              </div>
              <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-mono rounded">.SVG</span>
            </div>

            <button
              onClick={handleDownloadSvg}
              disabled={!svgString}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              <FileCode className="w-4 h-4" />
              <span>Vektörel SVG İndir</span>
            </button>
          </div>

          {/* PDF Download Button Box */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">A4 PDF Baskı Formatı (Vektör Kalitesi)</h4>
                <p className="text-xs text-slate-400">
                  {useProduction && !config.isProductionConfigured
                    ? 'Gerçek canlı URL tanımlanmadığı için nihai PDF üretimi kilitlidir.'
                    : 'Yazdırılmaya hazır kurumsal Medeniyet Teknopark afiş şablonlu A4 PDF dosyası.'}
                </p>
              </div>
              <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono rounded">.PDF</span>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={!qrTargetUrl || isGeneratingPdf}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-glow-brand transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              title={useProduction && !config.isProductionConfigured ? "Canlı URL tanımlanmadan PDF indirilemez" : "PDF İndir"}
            >
              <FileText className="w-4 h-4" />
              <span>
                {isGeneratingPdf 
                  ? 'PDF Hazırlanıyor...' 
                  : useProduction && !config.isProductionConfigured 
                    ? 'Production URL Bekleniyor (PDF Kilitli)' 
                    : 'A4 PDF Olarak İndir'}
              </span>
            </button>
          </div>

        </div>

      </div>

      {/* Printable Poster Modal View */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-white text-slate-900 p-8 sm:p-12 rounded-3xl shadow-2xl space-y-8 relative border-4 border-slate-900">
            
            {/* Close & Print Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Baskı Afiş Önizlemesi (A4 Formatı)
              </span>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTriggerPrint}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazdır (Print)</span>
                </button>
                
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Poster Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-brand-400" />
                <span>Medeniyet Teknopark</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                TechFix – Arıza / Talep Bildirim Sistemi
              </h2>
            </div>

            {/* Centered High Contrast QR */}
            <div className="text-center py-2 space-y-3">
              {pngDataUrl && (
                <img src={pngDataUrl} alt="Teknik QR Kodu" className="w-64 h-64 mx-auto border-4 border-slate-900 rounded-2xl p-2 bg-white" />
              )}
              <p className="text-sm font-bold text-slate-800">
                QR kodu okutarak bildirim oluşturabilirsiniz.
              </p>
            </div>

            {/* Instructions */}
            <div className="grid grid-cols-3 gap-4 text-center border-t border-b border-slate-200 py-6 text-xs">
              <div className="space-y-1">
                <span className="font-extrabold text-brand-600 block text-sm">01</span>
                <span className="font-bold text-slate-800">QR Kodu Tara</span>
                <p className="text-[10px] text-slate-500">Kamera ile okutun</p>
              </div>
              <div className="space-y-1">
                <span className="font-extrabold text-brand-600 block text-sm">02</span>
                <span className="font-bold text-slate-800">Ofisini Seç</span>
                <p className="text-[10px] text-slate-500">Konum ve arızayı girin</p>
              </div>
              <div className="space-y-1">
                <span className="font-extrabold text-brand-600 block text-sm">03</span>
                <span className="font-bold text-slate-800">Anında Takip Et</span>
                <p className="text-[10px] text-slate-500">Takip kodu ile izleyin</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 font-mono">
              TechFix Bina Yönetim Platformu • {qrTargetUrl}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
