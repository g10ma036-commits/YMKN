import { contextBridge } from 'electron'

// Expose minimal APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform
})
