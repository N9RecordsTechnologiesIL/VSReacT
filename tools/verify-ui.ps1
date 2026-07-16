# Interactive verification of the StashTrack VSReacT UI.
# Launches the Standalone, drives mouse/keyboard, captures screenshots.
param([string]$OutDir = "H:\code\11Tools\VSReacT\verify-shots")

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class UiDrive {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

New-Item -ItemType Directory -Force $OutDir | Out-Null

function Capture($hwnd, $name) {
  $r = New-Object UiDrive+RECT
  [UiDrive]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  $w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [UiDrive]::PrintWindow($hwnd, $hdc, 2) | Out-Null
  $g.ReleaseHdc($hdc); $g.Dispose()
  $bmp.Save((Join-Path $OutDir "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function ClickAt($hwnd, $cx, $cy) {
  $r = New-Object UiDrive+RECT
  [UiDrive]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  $x = $r.Left + $cx; $y = $r.Top + $cy
  [UiDrive]::SetCursorPos($x, $y) | Out-Null
  Start-Sleep -Milliseconds 250
  [UiDrive]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)  # down
  Start-Sleep -Milliseconds 60
  [UiDrive]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)  # up
  Start-Sleep -Milliseconds 350
}

function HoverAt($hwnd, $cx, $cy) {
  $r = New-Object UiDrive+RECT
  [UiDrive]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  [UiDrive]::SetCursorPos($r.Left + $cx, $r.Top + $cy) | Out-Null
  Start-Sleep -Milliseconds 400
}

$exe = "H:\code\11Tools\VSReacT\StashTrack\build-vs\StashTrack_artefacts\Release\Standalone\StashTrack.exe"
$proc = Start-Process $exe -PassThru
Start-Sleep -Seconds 4
$hwnd = (Get-Process StashTrack).MainWindowHandle
[UiDrive]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 500

# Title bar ~29px; client origin offset ~(1, 29). Redesigned layout: root p-4,
# header h-38, cards p-4.
$oy = 29

Capture $hwnd "1-initial"

# Hover the Download button (right side of URL row)
HoverAt $hwnd 622 (130 + $oy)
Capture $hwnd "2-hover-download"

# Click Download with empty URL -> expect error status + alert
ClickAt $hwnd 622 (130 + $oy)
Start-Sleep -Milliseconds 800
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save((Join-Path $OutDir "3-empty-url-click.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# Dismiss the alert (Enter)
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Milliseconds 500

# Click the URL field and type
ClickAt $hwnd 300 (130 + $oy)
[System.Windows.Forms.SendKeys]::SendWait("https://example.com/watch")
Start-Sleep -Milliseconds 400
Capture $hwnd "4-typed-url"

# Toggle the clip switch
ClickAt $hwnd 52 (194 + $oy)
Capture $hwnd "5-clip-on"

Stop-Process -Id $proc.Id -Force
"done"
