import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { NvmCore } from '../core/nvm';

export class NvmWebviewManager {
  public static currentPanel: NvmWebviewManager | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly nvm: NvmCore;
  private disposables: vscode.Disposable[] = [];
  private onStateChanged?: () => void;

  public static createOrShow(
    extensionUri: vscode.Uri,
    nvm: NvmCore,
    onStateChanged?: () => void
  ): NvmWebviewManager {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (NvmWebviewManager.currentPanel) {
      NvmWebviewManager.currentPanel.panel.reveal(column);
      NvmWebviewManager.currentPanel.refresh();
      return NvmWebviewManager.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'superNvmDashboard',
      'Super NVM',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionUri.fsPath, 'src', 'ui')),
          vscode.Uri.file(path.join(extensionUri.fsPath, 'out', 'ui')),
          vscode.Uri.file(path.join(extensionUri.fsPath, 'resources'))
        ]
      }
    );

    NvmWebviewManager.currentPanel = new NvmWebviewManager(
      panel,
      extensionUri,
      nvm,
      onStateChanged
    );
    return NvmWebviewManager.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    nvm: NvmCore,
    onStateChanged?: () => void
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.nvm = nvm;
    this.onStateChanged = onStateChanged;

    // Set panel icon
    this.panel.iconPath = vscode.Uri.file(
      path.join(extensionUri.fsPath, 'resources', 'nvm-icon.svg')
    );

    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      },
      null,
      this.disposables
    );
  }

  public async refresh(): Promise<void> {
    const info = await this.nvm.getNvmInfo();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const projectInfo = this.nvm.detectProjectVersion(workspaceFolder);

    this.postMessage({
      type: 'status',
      data: {
        ...info,
        projectVersionInfo: projectInfo
      }
    });
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'ready':
      case 'getStatus': {
        await this.refresh();
        break;
      }

      case 'getReleases': {
        const installed = await this.nvm.getInstalledVersions();
        const releases = await this.nvm.fetchRemoteReleases(installed.map(i => i.version));
        this.postMessage({
          type: 'releases',
          data: releases
        });
        break;
      }

      case 'useVersion': {
        const { version } = message;
        const result = await this.nvm.use(version);
        if (result.success) {
          vscode.window.showInformationMessage(`NVM: Switched to Node.js v${version}`);
          this.postMessage({
            type: 'operationComplete',
            success: true,
            message: result.message
          });
          if (this.onStateChanged) this.onStateChanged();
        } else {
          vscode.window.showErrorMessage(`NVM: ${result.message}`);
          this.postMessage({
            type: 'operationComplete',
            success: false,
            message: result.message
          });
        }
        await this.refresh();
        break;
      }

      case 'installVersion': {
        const { version } = message;
        this.postMessage({
          type: 'log',
          message: `\n[NVM] Installing Node.js v${version}...`
        });

        this.nvm.install(
          version,
          (data) => {
            this.postMessage({ type: 'log', message: data });
          },
          async (code) => {
            const success = code === 0;
            if (success) {
              vscode.window.showInformationMessage(
                `NVM: Successfully installed Node.js v${version}`
              );
            } else {
              vscode.window.showErrorMessage(
                `NVM: Failed to install Node.js v${version}`
              );
            }
            this.postMessage({
              type: 'operationComplete',
              success,
              message: success
                ? `Node.js v${version} installed successfully!`
                : `Installation exited with error code ${code}`
            });
            if (this.onStateChanged) this.onStateChanged();
            await this.refresh();
          }
        );
        break;
      }

      case 'uninstallVersion': {
        const { version } = message;
        this.postMessage({
          type: 'log',
          message: `\n[NVM] Uninstalling Node.js v${version}...`
        });

        this.nvm.uninstall(
          version,
          (data) => {
            this.postMessage({ type: 'log', message: data });
          },
          async (code) => {
            const success = code === 0;
            if (success) {
              vscode.window.showInformationMessage(
                `NVM: Successfully uninstalled Node.js v${version}`
              );
            } else {
              vscode.window.showErrorMessage(
                `NVM: Failed to uninstall Node.js v${version}`
              );
            }
            this.postMessage({
              type: 'operationComplete',
              success,
              message: success
                ? `Node.js v${version} uninstalled.`
                : `Uninstall failed with code ${code}`
            });
            if (this.onStateChanged) this.onStateChanged();
            await this.refresh();
          }
        );
        break;
      }

      case 'pinProject': {
        const { version } = message;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
          vscode.window.showWarningMessage('No workspace folder open to pin .nvmrc');
          return;
        }
        const ok = this.nvm.pinProjectVersion(version, workspaceFolder);
        if (ok) {
          vscode.window.showInformationMessage(
            `NVM: Pinned project to Node.js v${version} (.nvmrc created)`
          );
        } else {
          vscode.window.showErrorMessage('NVM: Failed to create .nvmrc');
        }
        await this.refresh();
        break;
      }

      case 'runDoctor': {
        this.postMessage({ type: 'log', message: '\n[NVM] Running nvm doctor...\n' });
        try {
          const out = await this.nvm.execCmd('nvm doctor');
          this.postMessage({ type: 'log', message: out });
        } catch (e: any) {
          this.postMessage({ type: 'log', message: `Error running doctor: ${e.message}` });
        }
        break;
      }

      case 'getGlobalPackages': {
        const pkgs = await this.nvm.getGlobalPackages(message.version);
        this.postMessage({
          type: 'globalPackages',
          version: message.version,
          data: pkgs
        });
        break;
      }

      case 'migratePackages': {
        const { packages } = message;
        this.postMessage({
          type: 'log',
          message: `\n[Super NVM] Migrating ${packages.length} global packages: ${packages.join(', ')}...`
        });

        this.nvm.migrateGlobalPackages(
          packages,
          (data) => {
            this.postMessage({ type: 'log', message: data });
          },
          async (code) => {
            const success = code === 0;
            if (success) {
              vscode.window.showInformationMessage('Super NVM: Global packages migrated successfully!');
            } else {
              vscode.window.showErrorMessage('Super NVM: Package migration encountered issues');
            }
            this.postMessage({
              type: 'operationComplete',
              success,
              message: success ? 'Global packages migrated!' : `Migration exited with code ${code}`
            });
            await this.refresh();
          }
        );
        break;
      }

      case 'getStorage': {
        const storage = await this.nvm.getStorageInfo();
        this.postMessage({
          type: 'storage',
          data: storage
        });
        break;
      }

      case 'cleanCache': {
        this.postMessage({ type: 'log', message: '\n[Super NVM] Cleaning cache...' });
        const res = await this.nvm.cleanCache();
        this.postMessage({ type: 'log', message: res.message });
        if (res.success) {
          vscode.window.showInformationMessage(res.message);
        } else {
          vscode.window.showErrorMessage(res.message);
        }
        const updatedStorage = await this.nvm.getStorageInfo();
        this.postMessage({ type: 'storage', data: updatedStorage });
        break;
      }

      case 'openExternal': {
        if (message.url) {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        break;
      }
    }
  }

  public postMessage(msg: any): void {
    this.panel.webview.postMessage(msg);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const uiDir = path.join(this.extensionUri.fsPath, 'src', 'ui');
    const htmlPath = path.join(uiDir, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(uiDir, 'style.css'))
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(uiDir, 'app.js'))
    );

    html = html.replace('href="style.css"', `href="${styleUri}"`);
    html = html.replace('src="app.js"', `src="${scriptUri}"`);

    return html;
  }

  public dispose(): void {
    NvmWebviewManager.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}
