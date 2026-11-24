import * as vscode from 'vscode';
import { NvmCore } from '../core/nvm';
import { NodeVersion } from '../core/types';

export class NvmTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly versionInfo?: NodeVersion,
    public readonly commandId?: string,
    public readonly isAction: boolean = false
  ) {
    super(label, collapsibleState);

    if (versionInfo) {
      this.description = versionInfo.isCurrent ? 'Active' : (versionInfo.isDefault ? 'Default' : '');
      this.contextValue = versionInfo.isCurrent ? 'activeVersion' : 'inactiveVersion';
      this.tooltip = `Node.js v${versionInfo.version} ${versionInfo.isCurrent ? '(Currently Active)' : ''}`;
      
      if (versionInfo.isCurrent) {
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
      } else {
        this.iconPath = new vscode.ThemeIcon('circle-outline');
      }

      this.command = {
        command: 'super-nvm.useFromTree',
        title: 'Switch to this version',
        arguments: [versionInfo.version]
      };
    } else if (commandId) {
      this.command = {
        command: commandId,
        title: label
      };
    }
  }
}

export class NvmTreeDataProvider implements vscode.TreeDataProvider<NvmTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<NvmTreeItem | undefined | void> = new vscode.EventEmitter<NvmTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<NvmTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private nvm: NvmCore;

  constructor(nvm: NvmCore) {
    this.nvm = nvm;
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: NvmTreeItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: NvmTreeItem): Promise<NvmTreeItem[]> {
    if (element) {
      return [];
    }

    try {
      const info = await this.nvm.getNvmInfo();
      const items: NvmTreeItem[] = [];

      // 1. Installed Versions
      for (const v of info.installedVersions) {
        items.push(
          new NvmTreeItem(
            `v${v.version}`,
            vscode.TreeItemCollapsibleState.None,
            v
          )
        );
      }

      if (items.length === 0) {
        const emptyItem = new NvmTreeItem(
          'No versions found',
          vscode.TreeItemCollapsibleState.None
        );
        emptyItem.description = 'Click to install';
        emptyItem.command = { command: 'super-nvm.installVersion', title: 'Install' };
        emptyItem.iconPath = new vscode.ThemeIcon('info');
        items.push(emptyItem);
      }

      return items;
    } catch (err: any) {
      const errorItem = new NvmTreeItem('Failed to load versions', vscode.TreeItemCollapsibleState.None);
      errorItem.description = err.message || '';
      errorItem.iconPath = new vscode.ThemeIcon('error');
      return [errorItem];
    }
  }
}
