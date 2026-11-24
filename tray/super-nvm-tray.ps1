Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectDir = Split-Path -Parent $ScriptDir

# Function to get installed Node versions and current version
function Get-NvmVersions {
    $output = nvm list 2>$null
    $versions = @()
    $activeVer = $null

    # First find which line has '*' (NVM source of truth)
    foreach ($line in ($output -split "`n")) {
        $trimmed = $line.Trim()
        if ($trimmed -match '^\*\s*(\d+\.\d+\.\d+)') {
            $activeVer = $matches[1]
            break
        }
    }
    if (-not $activeVer) {
        $activeVer = (node -v 2>$null) -replace '^v', ''
    }

    foreach ($line in ($output -split "`n")) {
        $trimmed = $line.Trim()
        if ($trimmed -match '^\*?\s*(\d+\.\d+\.\d+)') {
            $ver = $matches[1]
            $versions += [PSCustomObject]@{
                Version = $ver
                IsActive = ($ver -eq $activeVer)
            }
        }
    }
    return @{ Current = $activeVer; Versions = $versions }
}

# Create System Tray Icon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Text = "Super NVM - Loading..."
$notifyIcon.Visible = $true

# Draw an icon bitmap with emerald hexagon and S
$bitmap = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 197, 94))
$g.FillEllipse($brush, 2, 2, 28, 28)
$font = New-Object System.Drawing.Font ("Arial", 16, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.DrawString("S", $font, $textBrush, 5, 2)
$g.Dispose()
$hIcon = $bitmap.GetHicon()
$notifyIcon.Icon = [System.Drawing.Icon]::FromHandle($hIcon)

$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

function Update-TrayMenu {
    $data = Get-NvmVersions
    $current = $data.Current
    $notifyIcon.Text = "Super NVM: Node v$current"
    $contextMenu.Items.Clear()

    # Header item
    $headerItem = $contextMenu.Items.Add("Super NVM (Active: v$current)")
    $headerItem.Enabled = $false
    $headerItem.Font = New-Object System.Drawing.Font($contextMenu.Font, [System.Drawing.FontStyle]::Bold)
    $contextMenu.Items.Add("-") | Out-Null

    # Version list items
    foreach ($item in $data.Versions) {
        $v = $item.Version
        if ($item.IsActive) {
            $menuItem = $contextMenu.Items.Add("✓ Node v$v (Active)")
            $menuItem.Enabled = $false
        } else {
            $menuItem = $contextMenu.Items.Add("Switch to Node v$v")
            $menuItem.Tag = $v
            $menuItem.Add_Click({
                param($s, $e)
                $verToUse = $s.Tag
                nvm use $verToUse | Out-Null
                $notifyIcon.ShowBalloonTip(2000, "Super NVM", "Switched to Node.js v$verToUse", [System.Windows.Forms.ToolTipIcon]::Info)
                Start-Sleep -Milliseconds 400
                Update-TrayMenu
            })
        }
    }

    $contextMenu.Items.Add("-") | Out-Null

    # Dashboard item
    $dashItem = $contextMenu.Items.Add("Open Super NVM Dashboard")
    $dashItem.Add_Click({
        # Launch standalone server if not running, then open browser
        Start-Process "http://localhost:4321"
    })

    # Refresh item
    $refreshItem = $contextMenu.Items.Add("Refresh Versions")
    $refreshItem.Add_Click({
        Update-TrayMenu
    })

    $contextMenu.Items.Add("-") | Out-Null

    # Exit item
    $exitItem = $contextMenu.Items.Add("Exit Tray")
    $exitItem.Add_Click({
        $notifyIcon.Visible = $false
        [System.Windows.Forms.Application]::Exit()
    })
}

$notifyIcon.ContextMenuStrip = $contextMenu

# Double click opens dashboard
$notifyIcon.Add_DoubleClick({
    Start-Process "http://localhost:4321"
})

Update-TrayMenu

# Show startup balloon notification
$data = Get-NvmVersions
$notifyIcon.ShowBalloonTip(2500, "Super NVM", "Running in Taskbar Tray (Active: Node v$($data.Current)). Right-click to switch versions anytime!", [System.Windows.Forms.ToolTipIcon]::Info)

[System.Windows.Forms.Application]::Run()
