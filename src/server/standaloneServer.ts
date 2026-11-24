import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { NvmCore } from '../core/nvm';
import { detectEditors, installExtensionToEditors } from '../core/editorInstaller';

export interface ServerInstance {
  server: http.Server;
  port: number;
  close: () => Promise<void>;
}

export async function startStandaloneServer(
  port: number = 4321,
  autoOpenBrowser: boolean = true,
  projectDir?: string
): Promise<ServerInstance> {
  const nvm = new NvmCore();
  const sseClients: http.ServerResponse[] = [];

  const broadcastSSE = (type: string, data: any) => {
    const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {}
    }
  };

  const getUiDir = () => {
    const candidates = [
      path.join(__dirname, '..', '..', 'src', 'ui'),
      path.join(__dirname, '..', 'ui'),
      path.join(__dirname, 'ui'),
      path.join(process.cwd(), 'src', 'ui')
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(c, 'index.html'))) {
        return c;
      }
    }
    return path.join(process.cwd(), 'src', 'ui');
  };

  const uiDir = getUiDir();

  const parseBody = (req: http.IncomingMessage): Promise<any> => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  };

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      const pathname = parsedUrl.pathname;

      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

    // --- API Endpoints ---
    if (pathname === '/api/status') {
      try {
        const info = await nvm.getNvmInfo();
        const projInfo = nvm.detectProjectVersion(projectDir || process.cwd());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...info, projectVersionInfo: projInfo }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === '/api/releases') {
      try {
        const installed = await nvm.getInstalledVersions();
        const releases = await nvm.fetchRemoteReleases(installed.map((i) => i.version));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(releases));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === '/api/use' && req.method === 'POST') {
      const body = await parseBody(req);
      const version = body.version;
      broadcastSSE('log', `\n[NVM] Switching to Node.js v${version}...`);
      const result = await nvm.use(version);
      broadcastSSE('log', result.success ? `✓ ${result.message}` : `✗ ${result.message}`);
      broadcastSSE('operationComplete', {
        success: result.success,
        message: result.message
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (pathname === '/api/install' && req.method === 'POST') {
      const body = await parseBody(req);
      const version = body.version;
      broadcastSSE('log', `\n[NVM] Installing Node.js v${version}...`);

      nvm.install(
        version,
        (data) => {
          broadcastSSE('log', data);
        },
        (code) => {
          const success = code === 0;
          broadcastSSE('operationComplete', {
            success,
            message: success
              ? `Successfully installed Node.js v${version}`
              : `Installation failed with code ${code}`
          });
        }
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ started: true, version }));
      return;
    }

    if (pathname === '/api/uninstall' && req.method === 'POST') {
      const body = await parseBody(req);
      const version = body.version;
      broadcastSSE('log', `\n[NVM] Uninstalling Node.js v${version}...`);

      nvm.uninstall(
        version,
        (data) => {
          broadcastSSE('log', data);
        },
        (code) => {
          const success = code === 0;
          broadcastSSE('operationComplete', {
            success,
            message: success
              ? `Successfully uninstalled Node.js v${version}`
              : `Uninstall failed with code ${code}`
          });
        }
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ started: true, version }));
      return;
    }

    if (pathname === '/api/pin' && req.method === 'POST') {
      const body = await parseBody(req);
      const ok = nvm.pinProjectVersion(body.version, projectDir || process.cwd());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: ok }));
      return;
    }

    if (pathname === '/api/doctor') {
      try {
        const out = await nvm.execCmd('nvm doctor');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output: out }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === '/api/packages/global') {
      try {
        const ver = parsedUrl.searchParams.get('version') || undefined;
        const pkgs = await nvm.getGlobalPackages(ver);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(pkgs));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === '/api/packages/migrate' && req.method === 'POST') {
      const body = await parseBody(req);
      const packages: string[] = body.packages || [];
      broadcastSSE('log', `\n[Super NVM] Migrating ${packages.length} global packages...`);

      nvm.migrateGlobalPackages(
        packages,
        (data) => {
          broadcastSSE('log', data);
        },
        (code) => {
          const success = code === 0;
          broadcastSSE('operationComplete', {
            success,
            message: success
              ? `Migrated global packages successfully!`
              : `Package migration finished with code ${code}`
          });
        }
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ started: true, count: packages.length }));
      return;
    }

    if (pathname === '/api/storage') {
      try {
        const storageInfo = await nvm.getStorageInfo();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(storageInfo));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === '/api/storage/clean-cache' && req.method === 'POST') {
      try {
        const result = await nvm.cleanCache();
        broadcastSSE('log', `\n[Super NVM] ${result.message}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === '/api/editors') {
      try {
        const editors = detectEditors();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(editors));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === '/api/install-extension' && req.method === 'POST') {
      broadcastSSE('log', '\n[Super NVM] Starting multi-editor extension installer...');
      installExtensionToEditors((msg) => {
        broadcastSSE('log', msg);
      }).then((resObj) => {
        broadcastSSE('operationComplete', {
          success: resObj.success,
          message: resObj.message
        });
      }).catch((err) => {
        broadcastSSE('log', `\n[Error] ${err.message}`);
        broadcastSSE('operationComplete', {
          success: false,
          message: err.message
        });
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ started: true }));
      return;
    }

    // SSE Event Stream for live progress
    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write(': connected\n\n');
      sseClients.push(res);
      req.on('close', () => {
        const idx = sseClients.indexOf(res);
        if (idx !== -1) sseClients.splice(idx, 1);
      });
      return;
    }

    // Fallback for unmatched /api/* calls
    if (pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Endpoint ${pathname} not found` }));
      return;
    }

    // --- Static File Serving ---
    let relativeFile = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    const safePath = path.normalize(path.join(uiDir, relativeFile));

    // Ensure within uiDir
    if (!safePath.startsWith(uiDir) && !safePath.includes('resources')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    let filePath = safePath;
    if (pathname.startsWith('/resources/')) {
      filePath = path.join(__dirname, '..', '..', relativeFile);
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(uiDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png'
    };

    const contentType = mimeTypes[ext] || 'text/plain';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  } catch (globalErr: any) {
    console.error('NVM-UI server error:', globalErr);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: globalErr.message }));
    }
  }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => {
      const actualPort = (server.address() as any)?.port || port;
      const url = `http://localhost:${actualPort}`;

      if (autoOpenBrowser) {
        // Open default browser on Windows
        const cmd = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
        exec(cmd);
      }

      resolve({
        server,
        port: actualPort,
        close: () =>
          new Promise((resClose) => {
            server.close(() => resClose());
          })
      });
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        // Try next port
        console.warn(`Port ${port} unavailable (${err.code}), trying ${port + 1}...`);
        startStandaloneServer(port + 1, autoOpenBrowser, projectDir).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}
