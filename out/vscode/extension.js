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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const nvm_1 = require("../core/nvm");
const statusBar_1 = require("./statusBar");
const treeDataProvider_1 = require("./treeDataProvider");
const webviewPanel_1 = require("./webviewPanel");
const standaloneServer_1 = require("../server/standaloneServer");
function activate(context) {
    const nvm = new nvm_1.NvmCore();
    const statusBar = new statusBar_1.NvmStatusBar(nvm);
    const treeDataProvider = new treeDataProvider_1.NvmTreeDataProvider(nvm);
    const refreshAll = () => {
        treeDataProvider.refresh();
        statusBar.update();
        if (webviewPanel_1.NvmWebviewManager.currentPanel) {
            webviewPanel_1.NvmWebviewManager.currentPanel.refresh();
        }
    };
    // Register Tree View
    const treeView = vscode.window.registerTreeDataProvider('super-nvm-tree', treeDataProvider);
    context.subscriptions.push(treeView);
    // Command: Open Dashboard
    const openDashboardHandler = () => {
        webviewPanel_1.NvmWebviewManager.createOrShow(context.extensionUri, nvm, refreshAll);
    };
    const openDashboardCmd = vscode.commands.registerCommand('super-nvm.openDashboard', openDashboardHandler);
    const openDashboardAlias = vscode.commands.registerCommand('nvm-ui.openDashboard', openDashboardHandler);
    // Command: Switch Version (Interactive QuickPick)
    const switchVersionHandler = async () => {
        const installed = await nvm.getInstalledVersions();
        const current = await nvm.getCurrentNodeVersion();
        if (installed.length === 0) {
            const choice = await vscode.window.showWarningMessage('No Node.js versions found in NVM.', 'Install Version');
            if (choice === 'Install Version') {
                vscode.commands.executeCommand('super-nvm.installVersion');
            }
            return;
        }
        const items = installed.map((v) => {
            const isActive = v.version === current || v.isCurrent;
            return {
                label: `$(symbol-event) Node.js v${v.version}`,
                description: isActive ? '✓ (Currently Active)' : (v.isDefault ? '(Default)' : ''),
                detail: `Architecture: 64-bit`,
                picked: isActive
            };
        });
        items.push({
            label: '$(add) Install New Node.js Version...',
            description: 'Browse releases or type version number'
        });
        items.push({
            label: '$(dashboard) Open Super NVM Dashboard...',
            description: 'Full visual version manager'
        });
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Current: Node v${current || 'none'} — Select a version to activate`,
            matchOnDescription: true
        });
        if (!selected)
            return;
        if (selected.label.includes('Install New Node.js Version')) {
            vscode.commands.executeCommand('super-nvm.installVersion');
        }
        else if (selected.label.includes('Open Super NVM Dashboard')) {
            vscode.commands.executeCommand('super-nvm.openDashboard');
        }
        else {
            const match = selected.label.match(/v(\d+\.\d+\.\d+)/);
            if (match) {
                const versionToUse = match[1];
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Switching to Node.js v${versionToUse}...`,
                    cancellable: false
                }, async () => {
                    const res = await nvm.use(versionToUse);
                    if (res.success) {
                        vscode.window.showInformationMessage(`Now using Node.js v${versionToUse}`);
                        refreshAll();
                    }
                    else {
                        vscode.window.showErrorMessage(`Failed to switch: ${res.message}`);
                    }
                });
            }
        }
    };
    const switchVersionCmd = vscode.commands.registerCommand('super-nvm.switchVersion', switchVersionHandler);
    const switchVersionAlias = vscode.commands.registerCommand('nvm-ui.switchVersion', switchVersionHandler);
    // Command: Install Version
    const installVersionHandler = async () => {
        const versionInput = await vscode.window.showInputBox({
            prompt: 'Enter Node.js version to install (e.g. 22.14.0, lts, latest)',
            placeHolder: '22.14.0'
        });
        if (!versionInput)
            return;
        webviewPanel_1.NvmWebviewManager.createOrShow(context.extensionUri, nvm, refreshAll);
        if (webviewPanel_1.NvmWebviewManager.currentPanel) {
            webviewPanel_1.NvmWebviewManager.currentPanel.postMessage({
                command: 'installVersion',
                version: versionInput
            });
        }
    };
    const installVersionCmd = vscode.commands.registerCommand('super-nvm.installVersion', installVersionHandler);
    const installVersionAlias = vscode.commands.registerCommand('nvm-ui.installVersion', installVersionHandler);
    // Command: Refresh
    const refreshHandler = () => {
        refreshAll();
        vscode.window.showInformationMessage('Super NVM: Refreshed versions');
    };
    const refreshCmd = vscode.commands.registerCommand('super-nvm.refresh', refreshHandler);
    const refreshAlias = vscode.commands.registerCommand('nvm-ui.refresh', refreshHandler);
    // Command: Open Standalone in External Browser
    const openStandaloneHandler = async () => {
        const config = vscode.workspace.getConfiguration('superNVM');
        const port = config.get('standalonePort') || 4321;
        const server = await (0, standaloneServer_1.startStandaloneServer)(port, false);
        const url = `http://localhost:${server.port}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
        vscode.window.showInformationMessage(`Opened Super NVM at ${url}`);
    };
    const openStandaloneCmd = vscode.commands.registerCommand('super-nvm.openStandalone', openStandaloneHandler);
    const openStandaloneAlias = vscode.commands.registerCommand('nvm-ui.openStandalone', openStandaloneHandler);
    // Command: Use from tree
    const useFromTreeHandler = async (arg) => {
        const version = typeof arg === 'string' ? arg : (arg?.versionInfo?.version || arg?.label?.replace(/^v/, ''));
        if (!version)
            return;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Activating Node.js v${version}...`,
            cancellable: false
        }, async () => {
            const res = await nvm.use(version);
            if (res.success) {
                vscode.window.showInformationMessage(`Now using Node.js v${version}`);
                refreshAll();
            }
            else {
                vscode.window.showErrorMessage(`Error: ${res.message}`);
            }
        });
    };
    const useFromTreeCmd = vscode.commands.registerCommand('super-nvm.useFromTree', useFromTreeHandler);
    const useFromTreeAlias = vscode.commands.registerCommand('nvm-ui.useFromTree', useFromTreeHandler);
    // Command: Uninstall from tree
    const uninstallFromTreeHandler = async (item) => {
        const version = typeof item === 'string' ? item : (item?.versionInfo?.version || item?.label?.replace(/^v/, ''));
        if (!version)
            return;
        const answer = await vscode.window.showWarningMessage(`Are you sure you want to uninstall Node.js v${version}?`, { modal: true }, 'Uninstall');
        if (answer !== 'Uninstall')
            return;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Uninstalling Node.js v${version}...`,
            cancellable: false
        }, async () => {
            return new Promise((resolve) => {
                nvm.uninstall(version, () => { }, (code) => {
                    if (code === 0) {
                        vscode.window.showInformationMessage(`Uninstalled Node.js v${version}`);
                    }
                    else {
                        vscode.window.showErrorMessage(`Failed to uninstall Node.js v${version}`);
                    }
                    refreshAll();
                    resolve();
                });
            });
        });
    };
    const uninstallFromTreeCmd = vscode.commands.registerCommand('super-nvm.uninstallFromTree', uninstallFromTreeHandler);
    const uninstallFromTreeAlias = vscode.commands.registerCommand('nvm-ui.uninstallFromTree', uninstallFromTreeHandler);
    // Command: Pin project
    const pinProjectCmd = vscode.commands.registerCommand('super-nvm.pinProject', async () => {
        const current = await nvm.getCurrentNodeVersion();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace open to pin .nvmrc');
            return;
        }
        if (!current) {
            vscode.window.showWarningMessage('No active Node version to pin');
            return;
        }
        const ok = nvm.pinProjectVersion(current, workspaceFolder);
        if (ok) {
            vscode.window.showInformationMessage(`Pinned project to Node.js v${current} (.nvmrc created)`);
            refreshAll();
        }
    });
    // Auto-detect project Node version on startup
    const checkProjectVersion = async () => {
        const config = vscode.workspace.getConfiguration('superNVM');
        if (!config.get('autoDetectProjectVersion'))
            return;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder)
            return;
        const projInfo = nvm.detectProjectVersion(workspaceFolder);
        if (projInfo.requiredVersion) {
            const current = await nvm.getCurrentNodeVersion();
            if (!current || !current.startsWith(projInfo.requiredVersion)) {
                const autoSwitchSilently = config.get('autoSwitchSilently');
                const installed = await nvm.getInstalledVersions();
                const match = installed.find((v) => v.version.startsWith(projInfo.requiredVersion));
                if (autoSwitchSilently && match) {
                    // Silent automatic switch
                    await nvm.use(match.version);
                    refreshAll();
                    vscode.window.setStatusBarMessage(`⚡ Super NVM: Auto-switched to Node v${match.version} for this workspace`, 6000);
                    return;
                }
                const choice = await vscode.window.showInformationMessage(`Workspace specifies Node v${projInfo.requiredVersion} (${projInfo.source}). Current is v${current || 'none'}.`, match ? `Switch to v${match.version}` : `Install v${projInfo.requiredVersion}`, 'Always Auto-Switch', 'Ignore');
                if (choice === `Switch to v${match?.version}`) {
                    await nvm.use(match.version);
                    refreshAll();
                    vscode.window.showInformationMessage(`Switched to Node.js v${match.version}`);
                }
                else if (choice === `Install v${projInfo.requiredVersion}`) {
                    vscode.commands.executeCommand('super-nvm.openDashboard');
                }
                else if (choice === 'Always Auto-Switch') {
                    await config.update('autoSwitchSilently', true, vscode.ConfigurationTarget.Global);
                    if (match) {
                        await nvm.use(match.version);
                        refreshAll();
                        vscode.window.showInformationMessage(`Auto-switch enabled. Switched to Node v${match.version}`);
                    }
                }
            }
        }
    };
    checkProjectVersion();
    context.subscriptions.push(statusBar.item, openDashboardCmd, openDashboardAlias, switchVersionCmd, switchVersionAlias, installVersionCmd, installVersionAlias, refreshCmd, refreshAlias, openStandaloneCmd, openStandaloneAlias, useFromTreeCmd, useFromTreeAlias, uninstallFromTreeCmd, uninstallFromTreeAlias, pinProjectCmd);
}
function deactivate() {
    if (webviewPanel_1.NvmWebviewManager.currentPanel) {
        webviewPanel_1.NvmWebviewManager.currentPanel.dispose();
    }
}
//# sourceMappingURL=extension.js.map