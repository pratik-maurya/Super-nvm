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
exports.NvmStatusBar = void 0;
const vscode = __importStar(require("vscode"));
class NvmStatusBar {
    statusBarItem;
    nvm;
    constructor(nvm) {
        this.nvm = nvm;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'super-nvm.switchVersion';
        this.update();
    }
    get item() {
        return this.statusBarItem;
    }
    async update() {
        try {
            const info = await this.nvm.getNvmInfo();
            const current = info.currentVersion;
            if (current) {
                this.statusBarItem.text = `$(zap) Node v${current}`;
                this.statusBarItem.tooltip = `Node.js v${current} (via Super NVM)\nClick to switch Node version or open Super NVM`;
                this.statusBarItem.show();
            }
            else {
                this.statusBarItem.text = `$(warning) Node (None)`;
                this.statusBarItem.tooltip = 'No Node.js version active. Click to switch or install.';
                this.statusBarItem.show();
            }
        }
        catch {
            this.statusBarItem.hide();
        }
    }
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.NvmStatusBar = NvmStatusBar;
//# sourceMappingURL=statusBar.js.map