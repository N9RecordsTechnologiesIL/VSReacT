# Launches the StashTrack Standalone, captures its window, exits.
param(
  [string]$Exe = "H:\code\11Tools\VSReacT\StashTrack\build-vs\StashTrack_artefacts\Release\Standalone\StashTrack.exe",
  [string]$Out = "H:\code\11Tools\VSReacT\shot.png",
  [int]$WaitSeconds = 4,
  [switch]$KeepOpen
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class CapWin {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing

$proc = Start-Process $Exe -PassThru
Start-Sleep -Seconds $WaitSeconds

$proc.Refresh()
$hwnd = $proc.MainWindowHandle
[CapWin]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 900

$r = New-Object CapWin+RECT
[CapWin]::GetWindowRect($hwnd, [ref]$r) | Out-Null
$bmp = New-Object System.Drawing.Bitmap(($r.Right - $r.Left), ($r.Bottom - $r.Top))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[CapWin]::PrintWindow($hwnd, $hdc, 2) | Out-Null
$g.ReleaseHdc($hdc)
$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

if (-not $KeepOpen) { Stop-Process -Id $proc.Id -Force }
"captured $Out"
