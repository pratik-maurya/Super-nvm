import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { exec, execSync } from 'child_process';

export interface DetectedEditor {
  name: string;
  cliPath: string;
}

export interface InstallResult {
  success: boolean;
  installedCount: number;
  installedEditors: string[];
  message: string;
}

const GITHUB_VSIX_RELEASE_URL =
  'https://github.com/pratik-maurya/Super-nvm/releases/download/v1.0.0/super-nvm-1.0.0.vsix';

export function detectEditors(): DetectedEditor[] {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';

  const candidates: Array<{ name: string; paths: string[]; cliName: string }> = [
    {
      name: 'Google Antigravity IDE',
      paths: [
        path.join(localAppData, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd'),
        path.join(programFiles, 'Antigravity IDE', 'bin', 'antigravity-ide.cmd')
      ],
      cliName: 'antigravity-ide'
    },
    {
      name: 'Microsoft Visual Studio Code',
      paths: [
        path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
        path.join(programFiles, 'Microsoft VS Code', 'bin', 'code.cmd')
      ],
      cliName: 'code'
    },
    {
      name: 'Cursor IDE',
      paths: [
        path.join(localAppData, 'Programs', 'cursor', 'resources', 'app', 'bin', 'cursor.cmd'),
        path.join(localAppData, 'Programs', 'Cursor', 'resources', 'app', 'bin', 'cursor.cmd')
      ],
      cliName: 'cursor'
    },
    {
      name: 'Windsurf IDE',
      paths: [
        path.join(localAppData, 'Programs', 'Windsurf', 'bin', 'windsurf.cmd')
      ],
      cliName: 'windsurf'
    },
    {
      name: 'VSCodium',
      paths: [
        path.join(localAppData, 'Programs', 'VSCodium', 'bin', 'codium.cmd'),
        path.join(programFiles, 'VSCodium', 'bin', 'codium.cmd')
      ],
      cliName: 'codium'
    }
  ];

  const found: DetectedEditor[] = [];

  for (const item of candidates) {
    let matchedPath: string | null = null;

    for (const p of item.paths) {
      if (fs.existsSync(p)) {
        matchedPath = p;
        break;
      }
    }

    if (!matchedPath) {
      try {
        const out = execSync(`where ${item.cliName}`, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
        const firstLine = out.split(/\r?\n/)[0]?.trim();
        if (firstLine && fs.existsSync(firstLine)) {
          matchedPath = firstLine;
        }
      } catch {}
    }

    if (matchedPath) {
      found.push({ name: item.name, cliPath: matchedPath });
    }
  }

  return found;
}

export async function downloadVsix(dest: string, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const downloadWithRedirect = (url: string) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirect = res.headers.location;
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          if (redirect) {
            return downloadWithRedirect(redirect);
          }
          return reject(new Error('Redirect with no location header'));
        }

        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          return reject(new Error(`Failed to download VSIX: HTTP ${res.statusCode}`));
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        let current = 0;

        res.on('data', (chunk) => {
          current += chunk.length;
          if (total > 0 && onProgress) {
            onProgress(Math.round((current / total) * 100));
          }
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(dest);
        });
      }).on('error', (err) => {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        reject(err);
      });
    };

    downloadWithRedirect(GITHUB_VSIX_RELEASE_URL);
  });
}

export async function locateOrFetchVsix(onLog?: (msg: string) => void): Promise<string> {
  const localCandidates = [
    path.join(__dirname, '..', '..', 'super-nvm-1.0.0.vsix'),
    path.join(__dirname, '..', 'super-nvm-1.0.0.vsix'),
    path.join(process.cwd(), 'super-nvm-1.0.0.vsix'),
    path.join(process.env.TEMP || '.', 'super-nvm-1.0.0.vsix')
  ];

  for (const cand of localCandidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).size > 100000) {
      return cand;
    }
  }

  const tempDest = path.join(process.env.TEMP || '.', 'super-nvm-1.0.0.vsix');
  if (onLog) {
    onLog('Downloading Super NVM extension package (.vsix) from GitHub Releases...');
  }
  await downloadVsix(tempDest, (pct) => {
    if (onLog && pct % 25 === 0) {
      onLog(`Downloading extension package: ${pct}%...`);
    }
  });

  return tempDest;
}

export async function installExtensionToEditors(
  onLog?: (msg: string) => void
): Promise<InstallResult> {
  const log = onLog || console.log;

  log('\n======================================================================');
  log('           Super NVM — Universal Editor Extension Installer');
  log('======================================================================\n');

  let vsixPath: string;
  try {
    vsixPath = await locateOrFetchVsix(log);
    log(`[OK] Target Extension Package: ${vsixPath}\n`);
  } catch (err: any) {
    const msg = `Failed to obtain extension package: ${err.message}`;
    log(`[ERROR] ${msg}`);
    return { success: false, installedCount: 0, installedEditors: [], message: msg };
  }

  log('Scanning system for supported code editors...');
  const editors = detectEditors();

  if (editors.length === 0) {
    const msg = 'No supported editors (VS Code, Antigravity, Cursor, Windsurf, VSCodium) were detected.';
    log(`[INFO] ${msg}`);
    log('You can manually install the .vsix in your editor via Extensions menu ➔ "Install from VSIX..."\n');
    return { success: false, installedCount: 0, installedEditors: [], message: msg };
  }

  const installedEditors: string[] = [];

  for (const ed of editors) {
    log(`\n[FOUND] ${ed.name}`);
    log(`  Installing Super NVM extension...`);

    const installCmd = `"${ed.cliPath}" --install-extension "${vsixPath}"`;
    try {
      await new Promise<void>((resolve, reject) => {
        exec(installCmd, { windowsHide: true }, (err, stdout, stderr) => {
          if (err && !stdout.toLowerCase().includes('successfully installed')) {
            return reject(err);
          }
          resolve();
        });
      });

      log(`  \x1b[32m[OK]\x1b[0m Successfully installed into ${ed.name}!`);
      installedEditors.push(ed.name);
    } catch (err: any) {
      log(`  \x1b[33m[WARN]\x1b[0m Failed installing into ${ed.name}: ${err.message}`);
    }
  }

  log('\n======================================================================');
  if (installedEditors.length > 0) {
    log(`\x1b[32m[SUCCESS]\x1b[0m Super NVM has been installed into ${installedEditors.length} editor(s):`);
    for (const name of installedEditors) {
      log(`  • ${name}`);
    }
    log('\nReload or launch your editor to start managing Node versions with 1 click!');
    log('Look for "⚡ Node v..." in your editor\'s bottom status bar.');
  }
  log('======================================================================\n');

  return {
    success: installedEditors.length > 0,
    installedCount: installedEditors.length,
    installedEditors,
    message: `Installed into ${installedEditors.length} editor(s).`
  };
}
