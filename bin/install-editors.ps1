# Super NVM - Universal Multi-Editor Installer
$ErrorActionPreference = 'SilentlyContinue'

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $dir) { $dir = $PSScriptRoot }
if (-not $dir) { $dir = (Get-Location).Path }

$candidates = @(
    (Join-Path $dir 'super-nvm-1.0.0.vsix'),
    (Join-Path (Split-Path -Parent $dir) 'super-nvm-1.0.0.vsix'),
    (Join-Path (Get-Location) 'super-nvm-1.0.0.vsix')
)
$vsixPath = $null
foreach ($c in $candidates) {
    if (Test-Path $c) { $vsixPath = $c; break }
}

Clear-Host
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "           Super NVM - Universal Multi-Editor Installer" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $vsixPath) {
    Write-Host "[ERROR] Could not find super-nvm-1.0.0.vsix." -ForegroundColor Red
    Write-Host "Please ensure super-nvm-1.0.0.vsix is in the same folder as this script." -ForegroundColor Yellow
    Write-Host ""
    Read-Host 'Press Enter to exit'
    exit 1
}

Write-Host "Target Package: $vsixPath" -ForegroundColor Gray
Write-Host "Scanning system for installed development editors..." -ForegroundColor Gray
Write-Host ""

$editors = @(
    @{ Name = "Google Antigravity IDE"; Paths = @( (Join-Path $env:LOCALAPPDATA 'Programs\Antigravity IDE\bin\antigravity-ide.cmd'), (Join-Path $env:ProgramFiles 'Antigravity IDE\bin\antigravity-ide.cmd') ); CliName = "antigravity-ide" },
    @{ Name = "Microsoft Visual Studio Code"; Paths = @( (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'), (Join-Path $env:ProgramFiles 'Microsoft VS Code\bin\code.cmd') ); CliName = "code" },
    @{ Name = "Cursor IDE"; Paths = @( (Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\bin\cursor.cmd'), (Join-Path $env:LOCALAPPDATA 'Programs\Cursor\resources\app\bin\cursor.cmd') ); CliName = "cursor" },
    @{ Name = "Windsurf IDE"; Paths = @( (Join-Path $env:LOCALAPPDATA 'Programs\Windsurf\bin\windsurf.cmd') ); CliName = "windsurf" },
    @{ Name = "VSCodium"; Paths = @( (Join-Path $env:LOCALAPPDATA 'Programs\VSCodium\bin\codium.cmd'), (Join-Path $env:ProgramFiles 'VSCodium\bin\codium.cmd') ); CliName = "codium" }
)

$count = 0
foreach ($e in $editors) {
    $cli = $null
    foreach ($p in $e.Paths) {
        if (Test-Path $p) { $cli = $p; break }
    }
    if (-not $cli) {
        $cmd = Get-Command $e.CliName -ErrorAction SilentlyContinue
        if ($cmd) { $cli = $cmd.Source }
    }
    if ($cli) {
        Write-Host "[FOUND] $($e.Name)" -ForegroundColor Yellow
        Write-Host "  Installing Super NVM extension..." -ForegroundColor Gray
        $proc = Start-Process -FilePath $cli -ArgumentList "--install-extension `"$vsixPath`"" -Wait -NoNewWindow -PassThru
        if ($proc.ExitCode -eq 0) {
            Write-Host "  [OK] Successfully installed into $($e.Name)!" -ForegroundColor Green
            $count++
        } else {
            Write-Host "  [WARN] Installation finished with exit code $($proc.ExitCode)" -ForegroundColor DarkYellow
        }
        Write-Host ""
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan
if ($count -gt 0) {
    Write-Host "[SUCCESS] Super NVM has been installed into $count editor(s)!" -ForegroundColor Green
    Write-Host "Launch or reload your editor to start managing Node versions with 1 click." -ForegroundColor White
} else {
    Write-Host "[INFO] No extension-based editors were detected automatically." -ForegroundColor Yellow
    Write-Host "You can manually install the .vsix via your editor Extensions menu." -ForegroundColor White
}
Write-Host ""
Write-Host "For WebStorm, IntelliJ IDEA, PyCharm, Sublime Text, or Neovim:" -ForegroundColor Cyan
Write-Host "Double-click launch-tray.bat or launch-ui.bat to switch Node versions globally!" -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host 'Press Enter to exit'
