#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const standaloneServer_1 = require("./standaloneServer");
const editorInstaller_1 = require("../core/editorInstaller");
async function main() {
    const args = process.argv.slice(2);
    let port = 4321;
    let autoOpen = true;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i].toLowerCase();
        if (arg === '--install-extension' || arg === '-i' || arg === 'install-extension') {
            const res = await (0, editorInstaller_1.installExtensionToEditors)();
            process.exit(res.success ? 0 : 1);
        }
        else if (arg === '--detect-editors') {
            const editors = (0, editorInstaller_1.detectEditors)();
            console.log(`\nDetected ${editors.length} supported editor(s):`);
            for (const ed of editors) {
                console.log(`  • ${ed.name} (${ed.cliPath})`);
            }
            console.log('');
            process.exit(0);
        }
        else if (arg === '--port' || arg === '-p') {
            port = parseInt(args[i + 1], 10) || 4321;
            i++;
        }
        else if (arg === '--no-browser' || arg === '-n') {
            autoOpen = false;
        }
        else if (arg === '--help' || arg === '-h') {
            console.log(`
Super NVM - Node Version Manager Graphical Interface
Manage Node.js versions visually inside VS Code or in any browser!

Usage:
  super-nvm [options]
  npx super-nvm [options]

Commands & Options:
  -i, --install-extension Automatically install Super NVM extension into all detected editors
                          (Google Antigravity IDE, VS Code, Cursor, Windsurf, VSCodium)
  --detect-editors        Scan and list installed code editors compatible with Super NVM
  -p, --port <number>     Port to run the UI server on (default: 4321)
  -n, --no-browser        Do not automatically open default web browser
  -h, --help              Show this help message
      `);
            process.exit(0);
        }
    }
    console.log('\n' + '='.repeat(54));
    console.log('   \x1b[32m⬢\x1b[0m \x1b[1mSuper NVM\x1b[0m - Modern Node Version Manager GUI');
    console.log('   Windows v2.0+ & v1.x Compatibility Engine');
    console.log('='.repeat(54));
    try {
        const instance = await (0, standaloneServer_1.startStandaloneServer)(port, autoOpen, process.cwd());
        console.log(`\n \x1b[32m✓\x1b[0m UI Server is running at: \x1b[36mhttp://localhost:${instance.port}\x1b[0m`);
        console.log('   • Click versions to switch instantly (no CLI commands needed)');
        console.log('   • Browse LTS & Security releases with 1-click install');
        console.log('   • Auto-detects workspace .nvmrc and package.json\n');
        console.log(' Press [Ctrl+C] to stop the server.\n');
        process.on('SIGINT', async () => {
            console.log('\nShutting down Super NVM server...');
            await instance.close();
            process.exit(0);
        });
    }
    catch (err) {
        console.error('\x1b[31mFailed to start Super NVM server:\x1b[0m', err.message);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=cli.js.map