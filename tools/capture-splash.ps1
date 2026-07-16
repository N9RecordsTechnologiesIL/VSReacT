# Captures the splash sequence: launches the Standalone and snapshots frames
# as soon as the window exists.
$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class CapSplash {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing

function Snap($hwnd, $path) {
  $r = New-Object CapSplash+RECT
  [CapSplash]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  if (($r.Right - $r.Left) -lt 100) { return $false }
  $bmp = New-Object System.Drawing.Bitmap(($r.Right - $r.Left), ($r.Bottom - $r.Top))
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [CapSplash]::PrintWindow($hwnd, $hdc, 2) | Out-Null
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  return $true
}

$proc = Start-Process "H:\code\11Tools\VSReacT\StashTrack\build-vs\StashTrack_artefacts\Release\Standalone\StashTrack.exe" -PassThru

# Wait for the main window handle.
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 100
  $proc.Refresh()
  if ($proc.MainWindowHandle -ne 0) { break }
}

$hwnd = $proc.MainWindowHandle
"window after $($i * 100 + 100) ms"

$frames = @(300, 700, 1100, 1700, 2600, 4200)
$sw = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($ms in $frames) {
  while ($sw.ElapsedMilliseconds -lt $ms) { Start-Sleep -Milliseconds 20 }
  Snap $hwnd "H:\code\11Tools\VSReacT\splash-$ms.png" | Out-Null
  "frame $ms"
}

Stop-Process -Id $proc.Id -Force
"done"
