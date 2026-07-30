# Launches a JUCE plugin Standalone, waits for its editor window to exist, and
# captures it with PrintWindow — then crops to the client area.
#
# Two things this gets right that a naive capture doesn't:
#  * JUCE standalones leave Process.MainWindowHandle at 0 for several seconds,
#    so a fixed sleep + GetWindowRect yields a 0x0 rect. This polls EnumWindows
#    for the process's own visible top-level window.
#  * It uses PrintWindow (asks the window to render into our DC) rather than
#    CopyFromScreen. Screen-scraping captures whatever pixels happen to be at
#    those coordinates — the wrong window if the editor is occluded, or
#    unrelated desktop content if it restored off-screen (JUCE persists
#    windowX/windowY, which can be negative on a multi-monitor setup).
param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$TimeoutSeconds = 40,
  [int]$SettleMs = 2500,
  [int]$ClientOffsetY = 0,   # skip N px of host chrome inside the client area
  [switch]$KeepOpen
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PlugCap {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc e, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  public static IntPtr FindVisible(uint pid) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => {
      uint p; GetWindowThreadProcessId(h, out p);
      if (p == pid && IsWindowVisible(h)) {
        RECT r; GetClientRect(h, out r);
        if (r.Right - r.Left > 200 && r.Bottom - r.Top > 60) { found = h; return false; }
      }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@
Add-Type -AssemblyName System.Drawing

$proc = Start-Process $Exe -PassThru
$hwnd = [IntPtr]::Zero
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 400
  $hwnd = [PlugCap]::FindVisible([uint32]$proc.Id)
  if ($hwnd -ne [IntPtr]::Zero) { break }
}

if ($hwnd -eq [IntPtr]::Zero) {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  throw "no visible editor window for $Exe within $TimeoutSeconds s"
}

Start-Sleep -Milliseconds $SettleMs   # let the first React commit paint

$wr = New-Object PlugCap+RECT; [PlugCap]::GetWindowRect($hwnd, [ref]$wr) | Out-Null
$cr = New-Object PlugCap+RECT; [PlugCap]::GetClientRect($hwnd, [ref]$cr) | Out-Null
$originPt = New-Object PlugCap+POINT; $originPt.X = 0; $originPt.Y = 0
[PlugCap]::ClientToScreen($hwnd, [ref]$originPt) | Out-Null

$winW = $wr.Right - $wr.Left
$winH = $wr.Bottom - $wr.Top

# Render the whole window, then crop to the client area (client origin relative
# to the window's top-left), skipping any requested host chrome.
$full = New-Object System.Drawing.Bitmap $winW, $winH
$g = [System.Drawing.Graphics]::FromImage($full)
$hdc = $g.GetHdc()
$ok = [PlugCap]::PrintWindow($hwnd, $hdc, 2)   # 2 = PW_RENDERFULLCONTENT
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
