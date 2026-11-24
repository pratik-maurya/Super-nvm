"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NvmTreeDataProvider = exports.NvmTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class NvmTreeItem extends vscode.TreeItem {
    label;
    collapsibleState;
    versionInfo;
    commandId;
    isAction;
    constructor(label, collapsibleState, versionInfo, commandId, isAction = false) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.versionInfo = versionInfo;
        this.commandId = commandId;
        this.isAction = isAction;
        if (versionInfo) {
            this.description = versionInfo.isCurrent ? 'Active' : (versionInfo.isDefault ? 'Default' : '');
            this.contextValue = versionInfo.isCurrent ? 'activeVersion' : 'inactiveVersion';
            this.tooltip = `Node.js v${versionInfo.version} ${versionInfo.isCurrent ? '(Currently Active)' : ''}`;
            if (versionInfo.isCurrent) {
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            }
            else {
                this.iconPath = new vscode.ThemeIcon('circle-outline');
            }
            this.command = {
                command: 'super-nvm.useFromTree',
                title: 'Switch to this version',
                arguments: [versionInfo.version]
            };
        }
        else if (commandId) {
            this.command = {
                command: commandId,
                title: label
            };
        }
    }
}
exports.NvmTreeItem = NvmTreeItem;
class NvmTreeDataProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    nvm;
    constructor(nvm) {
        this.nvm = nvm;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        try {
            const info = await this.nvm.getNvmInfo();
            const items = [];
            // 1. Installed Versions
            for (const v of info.installedVersions) {
                items.push(new NvmTreeItem(`v${v.version}`, vscode.TreeItemCollapsibleState.None, v));
            }
            if (items.length === 0) {
                const emptyItem = new NvmTreeItem('No versions found', vscode.TreeItemCollapsibleState.None);
                emptyItem.description = 'Click to install';
                emptyItem.command = { command: 'super-nvm.installVersion', title: 'Install' };
                emptyItem.iconPath = new vscode.ThemeIcon('info');
                items.push(emptyItem);
            }
            return items;
        }
        catch (err) {
            const errorItem = new NvmTreeItem('Failed to load versions', vscode.TreeItemCollapsibleState.None);
            errorItem.description = err.message || '';
            errorItem.iconPath = new vscode.ThemeIcon('error');
            return [errorItem];
        }
    }
}
exports.NvmTreeDataProvider = NvmTreeDataProvider;
//# sourceMappingURL=treeDataProvider.js.map