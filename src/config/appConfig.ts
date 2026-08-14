/**
 * TechFix Central Configuration Service
 *
 * Manages the single universal QR target URL & app production domain.
 * Strictly separates Development (local/LAN) from Production environments.
 * Prevents generating production QR codes with localhost, 127.0.0.1, or 0.0.0.0.
 */

export interface AppUrlConfig {
  productionUrl: string | null;
  isProductionConfigured: boolean;
  developmentUrl: string;
  activeUrl: string;
  isLocalhost: boolean;
}

/**
 * Checks if a URL points to localhost, 127.0.0.1, or 0.0.0.0
 */
export const isLocalhostUrl = (url: string): boolean => {
  if (!url) return true;
  const lower = url.toLowerCase();
  return lower.includes('localhost') || lower.includes('127.0.0.1') || lower.includes('0.0.0.0');
};

/**
 * Reads the public production app URL from VITE_PUBLIC_APP_URL environment variable,
 * or provides a safe development/LAN fallback.
 */
export const getAppUrlConfig = (): AppUrlConfig => {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL;
  const devFallback = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  let productionUrl: string | null = null;
  let isProductionConfigured = false;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    if ((clean.startsWith('http://') || clean.startsWith('https://')) && !isLocalhostUrl(clean)) {
      productionUrl = clean;
      isProductionConfigured = true;
    }
  }

  // Auto-detect if running directly on the custom domain (techfix.medeniyetteknopark.com)
  if (typeof window !== 'undefined' && window.location.hostname.includes('medeniyetteknopark.com')) {
    productionUrl = window.location.origin;
    isProductionConfigured = true;
  }

  const activeUrl = isProductionConfigured ? productionUrl! : devFallback;
  const isLocalhost = isLocalhostUrl(activeUrl);

  return {
    productionUrl,
    isProductionConfigured,
    developmentUrl: devFallback,
    activeUrl,
    isLocalhost
  };
};

/**
 * Universal Public QR Code target link generator.
 *
 * @param useProductionOnly If true, requires a valid non-localhost VITE_PUBLIC_APP_URL.
 *                         If false, allows development/LAN testing URL.
 * @param customDevIp Optional custom LAN IP (e.g., http://192.168.1.50:3000) for phone testing on Wi-Fi.
 */
export const getUniversalQrTargetUrl = (useProductionOnly: boolean = true, customDevIp?: string): {
  qrTargetUrl: string | null;
  config: AppUrlConfig;
  error: string | null;
} => {
  const config = getAppUrlConfig();

  if (useProductionOnly) {
    if (!config.isProductionConfigured) {
      return {
        qrTargetUrl: null,
        config,
        error: 'Production adresi (VITE_PUBLIC_APP_URL) henüz tanımlanmadı veya localhost adresi içeriyor. Production QR kod üretilemez.'
      };
    }
    return {
      qrTargetUrl: `${config.productionUrl}/?action=create-report`,
      config,
      error: null
    };
  }

  // Development mode: custom LAN IP support or window.location.origin
  let devBase = config.developmentUrl;
  if (customDevIp && customDevIp.trim().length > 0) {
    let cleanIp = customDevIp.trim().replace(/\/+$/, '');
    if (!cleanIp.startsWith('http://') && !cleanIp.startsWith('https://')) {
      cleanIp = `http://${cleanIp}`;
    }
    devBase = cleanIp;
  }

  const qrTargetUrl = `${devBase}/?action=create-report`;

  return {
    qrTargetUrl,
    config,
    error: null
  };
};
