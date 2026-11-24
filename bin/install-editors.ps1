# Super NVM - Universal Multi-Editor Installer
$ErrorActionPreference = 'SilentlyContinue'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$vsixPath = Join-Path $rootDir 'super-nvm-1.0.0.vsix'

if (-not (Test-Path $vsixPath)) {
    $vsixPath = Join-Path $scriptDir 'super-nvm-1.0.0.vsix'
}

Clear-Host
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "           Super NVM — Universal Multi-Editor Installer" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $vsixPath)) {
    Write-Host "[ERROR] Could not find super-nvm-1.0.0.vsix." -ForegroundColor Red
    Write-Host "Please ensure the .vsix file is in the project folder." -ForegroundColor Yellow
    Write-Host ""
    Read-Host 'Press Enter to exit'

    exit 1
}

Write-Host "Target Package: $vsixPath" -ForegroundColor Gray
Write-Host "Scanning system for installed development editors..." -ForegroundColor Gray
Write-Host ""

$editors = @(
    @{
        Name = "Google Antigravity IDE";
        Paths = @(
            (Join-Path $env:LOCALAPPDATA 'Programs\Antigravity IDE\bin\antigravity-ide.cmd'),
            (Join-Path $env:ProgramFiles 'Antigravity IDE\bin\antigravity-ide.cmd')
        );
        CliName = "antigravity-ide"
    },
    @{
        Name = "Microsoft Visual Studio Code";
        Paths = @(
            (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'),
            (Join-Path $env:ProgramFiles 'Microsoft VS Code\bin\code.cmd')
        );
        CliName = "code"
    },
    @{
        Name = "Cursor IDE";
        Paths = @(
            (Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\bin\cursor.cmd'),
            (Join-Path $env:LOCALAPPDATA 'Programs\Cursor\resources\app\bin\cursor.cmd')
        );
        CliName = "cursor"
    },
    @{
        Name = "Windsurf IDE";
        Paths = @(
            (Join-Path $env:LOCALAPPDATA 'Programs\Windsurf\bin\windsurf.cmd')
        );
        CliName = "windsurf"
    },
    @{
        Name = "VSCodium";
        Paths = @(
            (Join-Path $env:LOCALAPPDATA 'Programs\VSCodium\bin\codium.cmd'),
            (Join-Path $env:ProgramFiles 'VSCodium\bin\codium.cmd')
        );
        CliName = "codium"
    }
)

$installedCount = 0

foreach ($editor in $editors) {
    $targetCli = $null

    foreach ($p in $editor.Paths) {
        if (Test-Path $p) {
            $targetCli = $p
            break
        }
    }

    if (-not $targetCli) {
        $cmd = Get-Command $editor.CliName -ErrorAction SilentlyContinue
        if ($cmd) {
            $targetCli = $cmd.Source
        }
    }

    if ($targetCli) {
        Write-Host "[FOUND] $($editor.Name)" -ForegroundColor Yellow
        Write-Host "  Installing Super NVM extension..." -ForegroundColor Gray
        
        $proc = Start-Process -FilePath $targetCli -ArgumentList "--install-extension `"$vsixPath`"" -Wait -NoNewWindow -PassThru
        
        if ($proc.ExitCode -eq 0) {
            Write-Host "  [OK] Successfully installed into $($editor.Name)!" -ForegroundColor Green
            $installedCount++
        } else {
            Write-Host "  [WARN] Installation finished with exit code $($proc.ExitCode)" -ForegroundColor DarkYellow
        }
        Write-Host ""
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan
if ($installedCount -gt 0) {
    Write-Host "[SUCCESS] Super NVM has been installed into $installedCount editor(s)!" -ForegroundColor Green
    Write-Host "Launch or reload your editor to start managing Node versions with 1 click." -ForegroundColor White
} else {
    Write-Host "[INFO] No extension-based editors were detected automatically." -ForegroundColor Yellow
    Write-Host "You can manually install the .vsix via your editor Extensions menu," -ForegroundColor White
    Write-Host "or use the standalone desktop UI via launch-ui.bat." -ForegroundColor White
}
Write-Host ""
Write-Host "For WebStorm, IntelliJ IDEA, PyCharm, Sublime Text, or Neovim:" -ForegroundColor Cyan
Write-Host "Double-click launch-tray.bat or launch-ui.bat to switch Node versions globally!" -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host 'Press Enter to exit'

