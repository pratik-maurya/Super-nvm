import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { 
  NodeVersion, 
  RemoteRelease, 
  NvmInfo, 
  ProjectVersionInfo,
  GlobalPackageInfo,
  StorageInfo,
  VersionStorageDetail
} from './types';

export const SUPER_NVM_DIR = path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE || 'C:\\', 'SuperNVM');
export const NATIVE_VERSIONS_DIR = path.join(SUPER_NVM_DIR, 'versions');
export const NATIVE_CURRENT_LINK = path.join(SUPER_NVM_DIR, 'current');

export class NvmCore {
  private nvmExecutable: string = 'nvm';

  constructor() {
    this.findNvmBinary();
    try {
      if (!fs.existsSync(NATIVE_VERSIONS_DIR)) {
        fs.mkdirSync(NATIVE_VERSIONS_DIR, { recursive: true });
      }
    } catch {}
  }

  private findNvmBinary(): string {
    const defaultPaths = [
      path.join(process.env.LOCALAPPDATA || '', 'Author Software', 'nvm', 'nvm.exe'),
      path.join(process.env.APPDATA || '', 'nvm', 'nvm.exe'),
      path.join(process.env.NVM_HOME || '', 'nvm.exe'),
      'C:\\Program Files\\nodejs\\nvm.exe'
    ];

    for (const p of defaultPaths) {
      if (p && fs.existsSync(p)) {
        this.nvmExecutable = `"${p}"`;
        return this.nvmExecutable;
      }
    }

    this.nvmExecutable = 'nvm';
    return this.nvmExecutable;
  }

  public isNvmAvailable(): boolean {
    const raw = this.nvmExecutable.replace(/^"|"$/g, '');
    if (fs.existsSync(raw)) {
      return true;
    }
    try {
      const { execSync } = require('child_process');
      execSync('where nvm', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  public getSpawnTarget(): { cmd: string; useShell: boolean } {
    const raw = this.nvmExecutable.replace(/^"|"$/g, '');
    if (fs.existsSync(raw)) {
      return { cmd: raw, useShell: false };
    }
    return { cmd: `"${raw}"`, useShell: true };
  }

  public async execCmd(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(cmd, { windowsHide: true, env: process.env }, (error, stdout, stderr) => {
        if (error) {
          // Some commands like nvm list might exit 0 or emit to stderr
          const output = (stdout || '') + (stderr || '');
          if (output.trim()) {
            return resolve(output);
          }
          return reject(error);
        }
        resolve(stdout || stderr || '');
      });
    });
  }

  public async getInstalledVersions(): Promise<NodeVersion[]> {
    const list: NodeVersion[] = [];
    const seen = new Set<string>();

    // 1. Check NVM if available
    if (this.isNvmAvailable()) {
      try {
        const output = await this.execCmd(`${this.nvmExecutable} list`);
        const nvmVersions = this.parseInstalledVersions(output);
        for (const v of nvmVersions) {
          list.push(v);
          seen.add(v.version);
        }
      } catch (err: any) {
        console.error('Error getting installed versions from NVM:', err);
      }
    }

    // 2. Check Super NVM Native versions
    if (fs.existsSync(NATIVE_VERSIONS_DIR)) {
      try {
        const entries = fs.readdirSync(NATIVE_VERSIONS_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('v')) {
            const verStr = entry.name.replace(/^v/, '');
            if (!seen.has(verStr)) {
              let isCurrent = false;
              if (fs.existsSync(NATIVE_CURRENT_LINK)) {
                try {
                  const target = fs.readlinkSync(NATIVE_CURRENT_LINK);
                  if (target.includes(entry.name)) {
                    isCurrent = true;
                  }
                } catch {}
              }
              list.push({
                version: verStr,
                isCurrent,
                isDefault: isCurrent,
                raw: verStr + ' (Super NVM Native)'
              });
              seen.add(verStr);
            }
          }
        }
      } catch {}
    }

    return list;
  }

  public parseInstalledVersions(output: string): NodeVersion[] {
    const versions: NodeVersion[] = [];
    const lines = output.split('\n');

    for (let rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;
      // Skip header lines or warning lines
      if (line.startsWith('No installations recognized') || line.startsWith('Installed Versions:')) {
        continue;
      }

      const isCurrent = line.startsWith('*');
      const isDefault = line.toLowerCase().includes('default') || isCurrent;
      
      // Clean string, e.g. "* 24.22.1  (default)" or "  14.21.3" or "* 20.9.0 (Currently using 64-bit executable)"
      let clean = line.replace(/^\*\s*/, '').trim();
      const parts = clean.split(/\s+/);
      const versionStr = parts[0]?.replace(/^v/, '');

      if (versionStr && /^\d+(\.\d+)?(\.\d+)?/.test(versionStr)) {
        versions.push({
          version: versionStr,
          isCurrent,
          isDefault,
          raw: rawLine.trim()
        });
      }
    }

    return versions;
  }

  public async getCurrentNodeVersion(): Promise<string | null> {
    try {
      const output = await this.execCmd('node -v');
      const match = output.trim().match(/v?(\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  public async getNvmInfo(): Promise<NvmInfo> {
    const installed = await this.getInstalledVersions();
    const currentNode = await this.getCurrentNodeVersion();
    const hasNvm = this.isNvmAvailable();
    let nvmVer = hasNvm ? '2.0.1' : '1.0.0 (Native)';
    let operatingMode = hasNvm ? 'nvm (shim)' : 'Super NVM (Native)';
    let nvmPath = hasNvm ? '' : SUPER_NVM_DIR;
    let installsPath = hasNvm ? '' : NATIVE_VERSIONS_DIR;

    if (hasNvm) {
      try {
        const verOut = await this.execCmd(`${this.nvmExecutable} --version`);
        const vMatch = verOut.match(/(\d+\.\d+\.\d+)/);
        if (vMatch) nvmVer = vMatch[1];
      } catch {}

      try {
        const envOut = await this.execCmd(`${this.nvmExecutable} env`);
        if (envOut.includes('Operating Mode')) {
          const modeMatch = envOut.match(/Operating Mode\s*:\s*(\w+)/);
          if (modeMatch) operatingMode = modeMatch[1];
        }
        if (envOut.includes('Path')) {
          const pathMatch = envOut.match(/Path\s*:\s*([^\r\n]+)/);
          if (pathMatch) nvmPath = pathMatch[1].trim();
        }
        if (envOut.includes('Installs')) {
          const insMatch = envOut.match(/Path\s*:\s*([^\r\n]+)/);
          if (insMatch) installsPath = insMatch[1].trim();
        }
      } catch {}
    }

    // Determine strictly ONE active version (source of truth is marked active version)
    const markedActive = installed.find(v => v.isCurrent)?.version;
    const activeVersion = markedActive || installed.find(v => v.version === currentNode)?.version || currentNode || null;
    const defaultVer = markedActive || installed.find(v => v.isDefault)?.version || activeVersion;

    // Guarantee that EXACTLY one version is marked isCurrent
    const enhancedInstalled = installed.map(v => {
      const isAct = Boolean(activeVersion && v.version === activeVersion);
      return {
        ...v,
        isCurrent: isAct,
        isDefault: Boolean(defaultVer && v.version === defaultVer)
      };
    });

    return {
      nvmVersion: nvmVer,
      currentVersion: activeVersion,
      defaultVersion: defaultVer,
      operatingMode,
      nvmPath,
      installsPath,
      installedVersions: enhancedInstalled,
      isNvmInstalled: true
    };
  }

  public async use(version: string): Promise<{ success: boolean; message: string }> {
    const cleanVer = version.replace(/^v/, '');
    const nativeTarget = path.join(NATIVE_VERSIONS_DIR, 'v' + cleanVer);

    // If native version exists, switch via junction
    if (fs.existsSync(nativeTarget)) {
      try {
        if (fs.existsSync(NATIVE_CURRENT_LINK)) {
          try {
            fs.unlinkSync(NATIVE_CURRENT_LINK);
          } catch {
            fs.rmSync(NATIVE_CURRENT_LINK, { recursive: true, force: true });
          }
        }
        fs.symlinkSync(nativeTarget, NATIVE_CURRENT_LINK, 'junction');
        this.ensureInPath(NATIVE_CURRENT_LINK);

        return {
          success: true,
          message: `Now using Node.js v${cleanVer} (Super NVM Native)`
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Failed to link Node.js v${cleanVer}: ${err.message}`
        };
      }
    }

    // Otherwise use NVM if available
    if (this.isNvmAvailable()) {
      try {
        const output = await this.execCmd(`${this.nvmExecutable} use ${cleanVer}`);
        const success = !output.toLowerCase().includes('failed') && !output.toLowerCase().includes('error');
        return {
          success,
          message: output.trim() || `Switched to Node.js v${cleanVer}`
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message || `Failed to switch to Node.js v${version}`
        };
      }
    }

    return {
      success: false,
      message: `Node.js v${cleanVer} is not installed.`
    };
  }

  public ensureInPath(dir: string): void {
    const currentPath = process.env.PATH || '';
    if (!currentPath.toLowerCase().includes(dir.toLowerCase())) {
      try {
        process.env.PATH = `${dir};${currentPath}`;
        const psCmd = `
          $curr = [Environment]::GetEnvironmentVariable('Path', 'User')
          if ($curr -notlike '*${dir}*') {
            [Environment]::SetEnvironmentVariable('Path', "$curr;${dir}", 'User')
          }
        `;
        exec(`powershell -NoProfile -Command "${psCmd.replace(/\r?\n/g, ' ')}"`, { windowsHide: true });
      } catch {}
    }
  }

  public install(
    version: string,
    onData: (data: string) => void,
    onClose: (code: number | null) => void
  ) {
    const cleanVer = version.replace(/^v/, '');

    if (this.isNvmAvailable()) {
      const target = this.getSpawnTarget();
      const child = spawn(target.cmd, ['install', cleanVer], {
        shell: target.useShell,
        windowsHide: true,
        env: process.env
      });

      child.stdout.on('data', (d) => onData(d.toString()));
      child.stderr.on('data', (d) => onData(d.toString()));
      child.on('close', (code) => onClose(code));
      child.on('error', (err) => {
        onData(`Error: ${err.message}\n`);
        onClose(1);
      });
      return child;
    }

    // Native standalone installation
    this.installNatively(cleanVer, onData, onClose);
    return null;
  }

  public async installNatively(
    version: string,
    onData: (data: string) => void,
    onClose: (code: number | null) => void
  ): Promise<void> {
    onData(`\n[Super NVM Native Engine] Installing Node.js v${version}...\n`);
    const zipUrl = `https://nodejs.org/dist/v${version}/node-v${version}-win-x64.zip`;
    const tempZip = path.join(process.env.TEMP || '.', `node-v${version}-win-x64.zip`);
    const targetDir = path.join(NATIVE_VERSIONS_DIR, `v${version}`);

    if (fs.existsSync(targetDir)) {
      onData(`[Super NVM] Node.js v${version} is already installed.\n`);
      onClose(0);
      return;
    }

    onData(`[Super NVM] Downloading from nodejs.org...\n`);
    try {
      await this.downloadFile(zipUrl, tempZip, (pct, mb, totalMb) => {
        onData(`[Download] ${pct}% (${mb} MB / ${totalMb} MB)\r`);
      });
      onData(`\n[Super NVM] Download complete. Extracting package...\n`);

      if (!fs.existsSync(NATIVE_VERSIONS_DIR)) {
        fs.mkdirSync(NATIVE_VERSIONS_DIR, { recursive: true });
      }

      const extractCmd = `tar -xf "${tempZip}" -C "${NATIVE_VERSIONS_DIR}"`;
      await this.execCmd(extractCmd).catch(async () => {
        await this.execCmd(`powershell -NoProfile -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${NATIVE_VERSIONS_DIR}' -Force"`);
      });

      const extractedFolderName = `node-v${version}-win-x64`;
      const extractedPath = path.join(NATIVE_VERSIONS_DIR, extractedFolderName);

      if (fs.existsSync(extractedPath)) {
        if (fs.existsSync(targetDir)) {
          fs.rmSync(targetDir, { recursive: true, force: true });
        }
        fs.renameSync(extractedPath, targetDir);
      }

      try { fs.unlinkSync(tempZip); } catch {}

      onData(`[Super NVM] Successfully installed Node.js v${version}!\n`);
      onClose(0);
    } catch (err: any) {
      onData(`\n[Super NVM Error] Failed to install Node.js: ${err.message}\n`);
      onClose(1);
    }
  }

  private downloadFile(
    url: string,
    dest: string,
    onProgress: (pct: number, mb: string, totalMb: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      const req = https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirect = res.headers.location;
          if (redirect) {
            file.close();
            return this.downloadFile(redirect, dest, onProgress).then(resolve).catch(reject);
          }
        }
        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          return reject(new Error(`Server returned HTTP ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const pct = Math.round((downloadedBytes / totalBytes) * 100);
            const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
            const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
            onProgress(pct, mb, totalMb);
          }
        });

        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      });

      req.on('error', (err) => {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        reject(err);
      });
    });
  }

  public uninstall(
    version: string,
    onData: (data: string) => void,
    onClose: (code: number | null) => void
  ) {
    const cleanVer = version.replace(/^v/, '');
    const nativeTarget = path.join(NATIVE_VERSIONS_DIR, 'v' + cleanVer);

    if (fs.existsSync(nativeTarget)) {
      onData(`[Super NVM] Uninstalling native Node.js v${cleanVer}...\n`);
      try {
        fs.rmSync(nativeTarget, { recursive: true, force: true });
        onData(`[Super NVM] Node.js v${cleanVer} uninstalled successfully.\n`);
        onClose(0);
      } catch (e: any) {
        onData(`Error removing version: ${e.message}\n`);
        onClose(1);
      }
      return null;
    }

    if (this.isNvmAvailable()) {
      const target = this.getSpawnTarget();
      const child = spawn(target.cmd, ['uninstall', cleanVer], {
        shell: target.useShell,
        windowsHide: true,
        env: process.env
      });

      child.stdout.on('data', (d) => onData(d.toString()));
      child.stderr.on('data', (d) => onData(d.toString()));
      child.on('close', (code) => onClose(code));
      child.on('error', (err) => {
        onData(`Error: ${err.message}\n`);
        onClose(1);
      });
      return child;
    }

    onData(`Node.js v${cleanVer} is not installed.\n`);
    onClose(1);
    return null;
  }

  public async fetchRemoteReleases(installedVersions: string[] = []): Promise<RemoteRelease[]> {
    return new Promise((resolve) => {
      const req = https.get(
        'https://nodejs.org/dist/index.json',
        { headers: { 'User-Agent': 'Super-NVM-Client' }, timeout: 6000 },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const list = JSON.parse(data);
              const mapped: RemoteRelease[] = list.map((item: any) => {
                const ver = item.version.replace(/^v/, '');
                return {
                  version: ver,
                  date: item.date,
                  lts: item.lts,
                  npm: item.npm,
                  security: item.security || false,
                  isInstalled: installedVersions.includes(ver)
                };
              });
              resolve(mapped);
            } catch (e) {
              resolve(this.fallbackReleases(installedVersions));
            }
          });
        }
      );

      req.on('error', () => {
        resolve(this.fallbackReleases(installedVersions));
      });
      req.on('timeout', () => {
        req.destroy();
        resolve(this.fallbackReleases(installedVersions));
      });
    });
  }

  private async fallbackReleases(installedVersions: string[]): Promise<RemoteRelease[]> {
    try {
      const out = await this.execCmd(`${this.nvmExecutable} list releases --limit=25`);
      const lines = out.split('\n');
      const list: RemoteRelease[] = [];

      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Version') || trimmed.startsWith('---') || trimmed.includes('listed')) {
          continue;
        }
        const parts = trimmed.split(/\s+/);
        if (parts[0] && parts[0].startsWith('v')) {
          const ver = parts[0].replace(/^v/, '');
          list.push({
            version: ver,
            date: parts[1] || '',
            lts: false,
            security: trimmed.includes('security release'),
            isInstalled: installedVersions.includes(ver)
          });
        }
      }
      return list;
    } catch {
      return [];
    }
  }

  public detectProjectVersion(projectDir?: string): ProjectVersionInfo {
    if (!projectDir || !fs.existsSync(projectDir)) {
      return { source: null, requiredVersion: null, rawSpec: null, matchesCurrent: true };
    }

    // Check .nvmrc
    const nvmrcPath = path.join(projectDir, '.nvmrc');
    if (fs.existsSync(nvmrcPath)) {
      const content = fs.readFileSync(nvmrcPath, 'utf8').trim();
      const ver = content.replace(/^v/, '').trim();
      return {
        source: '.nvmrc',
        requiredVersion: ver,
        rawSpec: content,
        matchesCurrent: false // Will be compared against current
      };
    }

    // Check .node-version
    const nodeVerPath = path.join(projectDir, '.node-version');
    if (fs.existsSync(nodeVerPath)) {
      const content = fs.readFileSync(nodeVerPath, 'utf8').trim();
      const ver = content.replace(/^v/, '').trim();
      return {
        source: '.node-version',
        requiredVersion: ver,
        rawSpec: content,
        matchesCurrent: false
      };
    }

    // Check package.json engines.node
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.engines && pkg.engines.node) {
          const spec = pkg.engines.node.trim();
          const clean = spec.replace(/[\^~>=<\s]/g, '');
          return {
            source: 'package.json',
            requiredVersion: clean,
            rawSpec: spec,
            matchesCurrent: false
          };
        }
      } catch {}
    }

    return { source: null, requiredVersion: null, rawSpec: null, matchesCurrent: true };
  }

  public pinProjectVersion(version: string, projectDir?: string): boolean {
    if (!projectDir || !fs.existsSync(projectDir)) return false;
    try {
      const cleanVer = version.replace(/^v/, '').trim();
      fs.writeFileSync(path.join(projectDir, '.nvmrc'), `v${cleanVer}\n`, 'utf8');
      return true;
    } catch (e) {
      console.error('Failed to pin version:', e);
      return false;
    }
  }

  public getInstallsDirectory(): string {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Author Software', 'nvm', 'installs'),
      path.join(process.env.APPDATA || '', 'nvm'),
      path.join(process.env.NVM_HOME || '', 'installs')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }

  public getCacheDirectory(): string {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Author Software', 'nvm', '.cache'),
      path.join(process.env.APPDATA || '', 'nvm', '.cache')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }

  public async getGlobalPackages(version?: string): Promise<GlobalPackageInfo[]> {
    const packages: GlobalPackageInfo[] = [];
    const ignored = new Set(['npm', 'corepack', '.verify', '.bin']);

    try {
      let nodeModulesPath = '';
      if (version) {
        const cleanVer = version.replace(/^v/, '');
        const installsDir = this.getInstallsDirectory();
        const vDir = path.join(installsDir, `v${cleanVer}`, 'node_modules');
        const altDir = path.join(installsDir, cleanVer, 'node_modules');
        if (fs.existsSync(vDir)) nodeModulesPath = vDir;
        else if (fs.existsSync(altDir)) nodeModulesPath = altDir;
      }

      if (nodeModulesPath && fs.existsSync(nodeModulesPath)) {
        const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('@') && entry.isDirectory()) {
            const scopeDir = path.join(nodeModulesPath, entry.name);
            const subEntries = fs.readdirSync(scopeDir, { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory() && !ignored.has(sub.name)) {
                const pkgName = `${entry.name}/${sub.name}`;
                let ver = 'installed';
                try {
                  const pkgJson = JSON.parse(fs.readFileSync(path.join(scopeDir, sub.name, 'package.json'), 'utf8'));
                  ver = pkgJson.version || ver;
                } catch {}
                packages.push({ name: pkgName, version: ver });
              }
            }
          } else if (entry.isDirectory() && !ignored.has(entry.name)) {
            let ver = 'installed';
            try {
              const pkgJson = JSON.parse(fs.readFileSync(path.join(nodeModulesPath, entry.name, 'package.json'), 'utf8'));
              ver = pkgJson.version || ver;
            } catch {}
            packages.push({ name: entry.name, version: ver });
          }
        }
        return packages;
      }

      // Fallback to npm list -g --depth=0 --json
      const jsonOut = await this.execCmd('npm list -g --depth=0 --json');
      const parsed = JSON.parse(jsonOut);
      if (parsed.dependencies) {
        for (const [name, info] of Object.entries<any>(parsed.dependencies)) {
          if (!ignored.has(name)) {
            packages.push({ name, version: info.version || 'installed' });
          }
        }
      }
    } catch {}

    return packages;
  }

  public migrateGlobalPackages(
    packages: string[],
    onData: (data: string) => void,
    onClose: (code: number) => void
  ) {
    if (!packages || packages.length === 0) {
      onData('No packages selected for migration.\n');
      onClose(0);
      return;
    }

    onData(`[Super NVM] Installing global packages: ${packages.join(', ')}...\n`);
    const child = spawn('npm.cmd', ['install', '-g', ...packages], {
      shell: true,
      windowsHide: true,
      env: process.env
    });

    child.stdout.on('data', (d) => onData(d.toString()));
    child.stderr.on('data', (d) => onData(d.toString()));
    child.on('close', (code) => onClose(code ?? 0));
    child.on('error', (err) => {
      onData(`Migration error: ${err.message}\n`);
      onClose(1);
    });

    return child;
  }

  public formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  }

  private calculateDirSize(dirPath: string): number {
    let size = 0;
    if (!fs.existsSync(dirPath)) return 0;
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dirPath, item.name);
        try {
          if (item.isDirectory()) {
            size += this.calculateDirSize(full);
          } else if (item.isFile()) {
            size += fs.statSync(full).size;
          }
        } catch {}
      }
    } catch {}
    return size;
  }

  public async getStorageInfo(): Promise<StorageInfo> {
    const installed = await this.getInstalledVersions();
    const installsDir = this.getInstallsDirectory();
    const cacheDir = this.getCacheDirectory();

    const versionDetails: VersionStorageDetail[] = [];
    let totalBytes = 0;

    for (const v of installed) {
      const clean = v.version.replace(/^v/, '');
      let vPath = path.join(installsDir, `v${clean}`);
      if (!fs.existsSync(vPath)) vPath = path.join(installsDir, clean);

      const sz = this.calculateDirSize(vPath);
      totalBytes += sz;

      const pkgs = await this.getGlobalPackages(v.version);
      versionDetails.push({
        version: v.version,
        sizeBytes: sz,
        formattedSize: this.formatBytes(sz),
        packageCount: pkgs.length
      });
    }

    const cacheBytes = this.calculateDirSize(cacheDir);
    totalBytes += cacheBytes;

    return {
      versions: versionDetails,
      cacheSizeBytes: cacheBytes,
      formattedCacheSize: this.formatBytes(cacheBytes),
      totalSizeBytes: totalBytes,
      formattedTotalSize: this.formatBytes(totalBytes)
    };
  }

  public async cleanCache(): Promise<{ success: boolean; freedBytes: number; message: string }> {
    const cacheDir = this.getCacheDirectory();
    let freedBytes = 0;

    try {
      if (fs.existsSync(cacheDir)) {
        freedBytes = this.calculateDirSize(cacheDir);
        try {
          fs.rmSync(cacheDir, { recursive: true, force: true });
          fs.mkdirSync(cacheDir, { recursive: true });
        } catch {
          // Fallback if directory lock exists: delete individual files inside
          const entries = fs.readdirSync(cacheDir);
          for (const e of entries) {
            try {
              fs.rmSync(path.join(cacheDir, e), { recursive: true, force: true });
            } catch {}
          }
        }
      }

      // Also invoke nvm cache remove if available
      try {
        await this.execCmd(`${this.nvmExecutable} cache remove --all`);
      } catch {}

      return {
        success: true,
        freedBytes,
        message: freedBytes > 0
          ? `Successfully cleaned cache, freed ${this.formatBytes(freedBytes)}`
          : 'NVM cache is clean (0 MB freed)'
      };
    } catch (err: any) {
      return {
        success: false,
        freedBytes: 0,
        message: `Failed to clean cache: ${err.message}`
      };
    }
  }
}

