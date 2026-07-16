# Captures every visible top-level window of a process via PrintWindow,
# without changing z-order or focus.
param(
  [string]$ProcessName = "StashTrack",
  [string]$OutPrefix = "H:\code\11Tools\VSReacT\pidwin"
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class WinEnum {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  public static List<IntPtr> WindowsOf(uint targetPid) {
    var found = new List<IntPtr>();
    EnumWindows((h, l) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (pid == targetPid && IsWindowVisible(h)) found.Add(h);
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@
Add-Type -AssemblyName System.Drawing

$proc = Get-Process $ProcessName -ErrorAction Stop | Select-Object -First 1
$handles = [WinEnum]::WindowsOf([uint32]$proc.Id)
$i = 0

foreach ($h in $handles) {
  $r = New-Object WinEnum+RECT
  [WinEnum]::GetWindowRect($h, [ref]$r) | Out-Null
  $w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
  if ($w -lt 50 -or $ht -lt 50) { continue }
  $bmp = New-Object System.Drawing.Bitmap($w, $ht)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [WinEnum]::PrintWindow($h, $hdc, 2) | Out-Null
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  $bmp.Save("$OutPrefix-$i.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  "saved $OutPrefix-$i.png (${w}x${ht})"
  $i++
}

if ($i -eq 0) { "no windows captured" }
