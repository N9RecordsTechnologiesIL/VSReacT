# Launches a JUCE plugin Standalone, waits for its editor window to exist, and
# captures it with PrintWindow — then crops to the client area.
#
# Window-finding (why we poll EnumWindows instead of trusting
# Process.MainWindowHandle or the saved window position) lives in
# PluginWindow.ps1. What this script itself gets right that a naive capture
# doesn't: it uses PrintWindow (asks the window to render into our DC) rather
# than CopyFromScreen. Screen-scraping captures whatever pixels happen to be
# at those coordinates — the wrong window if the editor is occluded, or
# unrelated desktop content if it restored off-screen.
param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$TimeoutSeconds = 40,
  [int]$SettleMs = 2500,
  [int]$ClientOffsetY = 0,   # skip N px of host chrome inside the client area
  [switch]$KeepOpen
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\PluginWindow.ps1"
Add-Type -AssemblyName System.Drawing

$proc = Start-Process $Exe -PassThru
$hwnd = Wait-PluginWindow -ProcessId $proc.Id -TimeoutSec $TimeoutSeconds

if ($hwnd -eq [IntPtr]::Zero) {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  throw "no visible editor window for $Exe within $TimeoutSeconds s"
}

Start-Sleep -Milliseconds $SettleMs   # let the first React commit paint

$wr = New-Object PluginWindow+RECT; [PluginWindow]::GetWindowRect($hwnd, [ref]$wr) | Out-Null
$cr = New-Object PluginWindow+RECT; [PluginWindow]::GetClientRect($hwnd, [ref]$cr) | Out-Null
$originPt = New-Object PluginWindow+POINT; $originPt.X = 0; $originPt.Y = 0
[PluginWindow]::ClientToScreen($hwnd, [ref]$originPt) | Out-Null

$winW = $wr.Right - $wr.Left
$winH = $wr.Bottom - $wr.Top

# Render the whole window, then crop to the client area (client origin relative
# to the window's top-left), skipping any requested host chrome.
$full = New-Object System.Drawing.Bitmap $winW, $winH
$g = [System.Drawing.Graphics]::FromImage($full)
$hdc = $g.GetHdc()
$ok = [PluginWindow]::PrintWindow($hwnd, $hdc, 2)   # 2 = PW_RENDERFULLCONTENT
$g.ReleaseHdc($hdc)
$g.Dispose()

if (-not $ok) {
  $full.Dispose()
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  throw "PrintWindow failed for $Exe"
}

$dx = $originPt.X - $wr.Left
$dy = ($originPt.Y - $wr.Top) + $ClientOffsetY
$cw = $cr.Right - $cr.Left
$ch = ($cr.Bottom - $cr.Top) - $ClientOffsetY

$rect = New-Object System.Drawing.Rectangle $dx, $dy, $cw, $ch
$client = $full.Clone($rect, $full.PixelFormat)
$client.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "captured ${cw}x${ch} (PrintWindow) -> $Out"

$client.Dispose(); $full.Dispose()
if (-not $KeepOpen) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
