import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getAppsDir: () => Promise<string>;
      checkInstalled: (productId: string) => Promise<boolean>;
      startDownload: (url: string, productId: string) => void;
      launchApp: (productId: string) => Promise<{ success: boolean, error?: string }>;
      onDownloadProgress: (callback: (data: { productId: string, progress: number, status?: string }) => void) => () => void;
      onDownloadComplete: (callback: (data: { productId: string, success: boolean, error?: string }) => void) => () => void;
    }
  }
}
