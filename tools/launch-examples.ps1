# Launches the example Standalones and parks each window at a known on-screen
# position, then reports where they landed.
#
# Never trusts the saved window position and never trusts
# Process.MainWindowHandle — see PluginWindow.ps1 for why (JUCE persists
# windowX/windowY, so standalones can restore fully off-screen; the handle
# stays 0 for several seconds).
param(
  [string[]]$Only,          # e.g. -Only gain,drums  (default: all)
  [switch]$CloseFirst       # kill any already-running instances first
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

. "$PSScriptRoot\PluginWindow.ps1"

# Positions are hand-placed for a 2732x768 virtual desktop (two 1366x768
# monitors, the secondary to the LEFT at negative x). Five editors this size
# cannot tile without overlap, so they are staggered: every title bar stays
# clickable even where bodies overlap.
$examples = @(
  @{ name = "channel"; target = "ChannelExample"; product = "VSReacT Channel"; x = -1366; y = 0 }
  @{ name = "drums";   target = "DrumsExample";   product = "VSReacT Drums";   x =  -586; y = 0 }
  @{ name = "gain";    target = "GainExample";    product = "VSReacT Gain";    x =   262; y = 0 }
  @{ name = "delay";   target = "DelayExample";   product = "VSReacT Delay";   x =   565; y = 168 }
  @{ name = "synth";   target = "SynthExample";   product = "VSReacT Synth";   x =  -700; y = 250 }
)

if ($Only) { $examples = $examples | Where-Object { $Only -contains $_.name } }

if ($CloseFirst) {
  foreach ($e in $examples) {
    Get-Process -Name $e.product -ErrorAction SilentlyContinue | Stop-Process -Force
  }
}

# Start every exe first, so their (multi-second) startups overlap instead of
# summing; then run one poll loop over the whole pending set.
$pending = @()
foreach ($e in $examples) {
  $exe = Join-Path $root ("vsreact\examples\{0}\build-vs\{1}_artefacts\Release\Standalone\{2}.exe" -f $e.name, $e.target, $e.product)

  if (-not (Test-Path $exe)) {
    Write-Output ("{0,-8} NOT BUILT ({1})" -f $e.name, $exe)
    continue
  }

  $proc = Start-Process $exe -PassThru
  $pending += @{ name = $e.name; proc = $proc; x = $e.x; y = $e.y }
}

# Shared deadline for the batch: place each window the moment it appears.
$deadline = (Get-Date).AddSeconds(40)
while ($pending.Count -gt 0 -and (Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 400
  $still = @()
  foreach ($p in $pending) {
    $hwnd = [PluginWindow]::FindVisible([uint32]$p.proc.Id)
    if ($hwnd -eq [IntPtr]::Zero) { $still += $p; continue }

    [PluginWindow]::ShowWindow($hwnd, 9) | Out-Null                            # SW_RESTORE, in case it saved minimized
    # 0x0001 SWP_NOSIZE | 0x0004 SWP_NOZORDER — move only.
    [PluginWindow]::SetWindowPos($hwnd, [IntPtr]::Zero, $p.x, $p.y, 0, 0, 0x0005) | Out-Null
    Start-Sleep -Milliseconds 200

    $r = New-Object PluginWindow+RECT
    [PluginWindow]::GetWindowRect($hwnd, [ref]$r) | Out-Null
    Write-Output ("{0,-8} pid {1,-6} window {2}x{3} at ({4},{5})" -f `
      $p.name, $p.proc.Id, ($r.Right - $r.Left), ($r.Bottom - $r.Top), $r.Left, $r.Top)
  }
  $pending = $still
}

foreach ($p in $pending) {
  Write-Output ("{0,-8} launched (pid {1}) but no visible window after 40s" -f $p.name, $p.proc.Id)
}
