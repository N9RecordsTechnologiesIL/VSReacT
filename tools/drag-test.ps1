# Drags the mouse on a running window from a client point upward, capturing
# before/after. Verifies VSReacT drag gestures end-to-end.
param(
  [string]$ProcessName = "VSReacT Gain",
  [int]$ClientX = 146,
  [int]$ClientY = 187,
  [int]$DragDy = -70,
  [string]$OutPrefix = "H:\code\11Tools\VSReacT\drag"
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DragDrive {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing

function Snap($hwnd, $path) {
  $r = New-Object DragDrive+RECT
  [DragDrive]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  $bmp = New-Object System.Drawing.Bitmap(($r.Right - $r.Left), ($r.Bottom - $r.Top))
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [DragDrive]::PrintWindow($hwnd, $hdc, 2) | Out-Null
  $g.ReleaseHdc($hdc); $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*$ProcessName*" } | Select-Object -First 1
if (-not $proc) { throw "No window matching $ProcessName" }
$hwnd = $proc.MainWindowHandle
[DragDrive]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 400

Snap $hwnd "$OutPrefix-before.png"

$r = New-Object DragDrive+RECT
[DragDrive]::GetWindowRect($hwnd, [ref]$r) | Out-Null
$x = $r.Left + $ClientX
$y = $r.Top + $ClientY

[DragDrive]::SetCursorPos($x, $y) | Out-Null
Start-Sleep -Milliseconds 150
[DragDrive]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)   # down
Start-Sleep -Milliseconds 100

# Drag upward in steps.
$steps = 10
for ($i = 1; $i -le $steps; $i++) {
  [DragDrive]::SetCursorPos($x, $y + [int]($DragDy * $i / $steps)) | Out-Null
  Start-Sleep -Milliseconds 30
}

Start-Sleep -Milliseconds 150
[DragDrive]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)   # up
Start-Sleep -Milliseconds 400

Snap $hwnd "$OutPrefix-after.png"
"dragged ($ClientX,$ClientY) by $DragDy"
