import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getAppsDir: () => electronAPI.ipcRenderer.invoke('get-apps-dir'),
  checkInstalled: (productId: string) => electronAPI.ipcRenderer.invoke('check-installed', productId),
  startDownload: (url: string, productId: string) => electronAPI.ipcRenderer.send('start-download', { url, productId }),
  launchApp: (productId: string) => electronAPI.ipcRenderer.invoke('launch-app', productId),
  onDownloadProgress: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    electronAPI.ipcRenderer.on('download-progress', listener);
    return () => electronAPI.ipcRenderer.removeListener('download-progress', listener);
  },
  onDownloadComplete: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    electronAPI.ipcRenderer.on('download-complete', listener);
    return () => electronAPI.ipcRenderer.removeListener('download-complete', listener);
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
