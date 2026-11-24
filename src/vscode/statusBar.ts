import * as vscode from 'vscode';
import { NvmCore } from '../core/nvm';

export class NvmStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private nvm: NvmCore;

  constructor(nvm: NvmCore) {
    this.nvm = nvm;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'super-nvm.switchVersion';
    this.update();
  }

  public get item(): vscode.StatusBarItem {
    return this.statusBarItem;
  }

  public async update(): Promise<void> {
    try {
      const info = await this.nvm.getNvmInfo();
      const current = info.currentVersion;
      if (current) {
        this.statusBarItem.text = `$(zap) Node v${current}`;
        this.statusBarItem.tooltip = `Node.js v${current} (via Super NVM)\nClick to switch Node version or open Super NVM`;
        this.statusBarItem.show();
      } else {
        this.statusBarItem.text = `$(warning) Node (None)`;
        this.statusBarItem.tooltip = 'No Node.js version active. Click to switch or install.';
        this.statusBarItem.show();
      }
    } catch {
      this.statusBarItem.hide();
    }
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}
