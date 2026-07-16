# Captures the running Standalone twice to verify animations advance.
$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class CapAnim {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing

$proc = Start-Process "H:\code\11Tools\VSReacT\StashTrack\build-vs\StashTrack_artefacts\Release\Standalone\StashTrack.exe" -PassThru
Start-Sleep -Seconds 4
$proc.Refresh()
$hwnd = $proc.MainWindowHandle
[CapAnim]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 800

function Snap($hwnd, $path) {
  $r = New-Object CapAnim+RECT
  [CapAnim]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  $bmp = New-Object System.Drawing.Bitmap(($r.Right - $r.Left), ($r.Bottom - $r.Top))
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [CapAnim]::PrintWindow($hwnd, $hdc, 2) | Out-Null
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Snap $hwnd "H:\code\11Tools\VSReacT\anim-a.png"
Start-Sleep -Milliseconds 700
Snap $hwnd "H:\code\11Tools\VSReacT\anim-b.png"

# Compare the logo tile region (roughly x 20..70, y 40..90 in window coords)
Add-Type -AssemblyName System.Drawing
$a = [System.Drawing.Bitmap]::FromFile("H:\code\11Tools\VSReacT\anim-a.png")
$b = [System.Drawing.Bitmap]::FromFile("H:\code\11Tools\VSReacT\anim-b.png")
$diff = 0
for ($y = 40; $y -lt 90; $y++) {
  for ($x = 20; $x -lt 70; $x++) {
    if ($a.GetPixel($x, $y) -ne $b.GetPixel($x, $y)) { $diff++ }
  }
}
$a.Dispose(); $b.Dispose()
Stop-Process -Id $proc.Id -Force
"logo pixel differences: $diff"
