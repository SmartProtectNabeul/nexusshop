import { ipcMain, app } from 'electron';
import { join } from 'path';
import fs from 'fs';
import axios from 'axios';
import extract from 'extract-zip';

export function setupNexusBridge() {
  const appsDir = join(app.getPath('userData'), 'NexusApps');
  if (!fs.existsSync(appsDir)) fs.mkdirSync(appsDir, { recursive: true });

  ipcMain.handle('get-apps-dir', () => appsDir);

  ipcMain.handle('check-installed', (_, productId: string) => {
    return fs.existsSync(join(appsDir, productId));
  });

  ipcMain.on('start-download', async (event, { url, productId }) => {
    const downloadPath = join(app.getPath('temp'), `${productId}.zip`);
    const productDir = join(appsDir, productId);

    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
      });

      const totalLength = parseInt((response.headers['content-length'] as string) || '0');
      let downloadedLength = 0;

      const writer = fs.createWriteStream(downloadPath);

      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length;
        const progress = totalLength ? (downloadedLength / totalLength) * 100 : 0;
        event.reply('download-progress', { productId, progress });
      });

      response.data.pipe(writer);

      writer.on('finish', async () => {
        event.reply('download-progress', { productId, progress: 100, status: 'Extracting' });
        
        try {
          if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });
          await extract(downloadPath, { dir: productDir });
          fs.unlinkSync(downloadPath); // Cleanup zip
          event.reply('download-complete', { productId, success: true });
        } catch (err) {
          console.error('Extraction error:', err);
          event.reply('download-complete', { productId, success: false, error: 'Extraction failed' });
        }
      });

    } catch (err) {
      console.error('Download error:', err);
      event.reply('download-complete', { productId, success: false, error: 'Download failed' });
    }
  });

  ipcMain.handle('launch-app', async (_, productId: string) => {
    const productDir = join(appsDir, productId);
    if (!fs.existsSync(productDir)) return { success: false, error: 'Product not installed' };

    const files = fs.readdirSync(productDir);
    const exe = files.find(f => f.endsWith('.exe'));
    
    if (exe) {
      const { spawn } = require('child_process');
      spawn(join(productDir, exe), [], {
        detached: true,
        stdio: 'ignore'
      }).unref();
      return { success: true };
    }
    return { success: false, error: 'No executable found' };
  });
}
