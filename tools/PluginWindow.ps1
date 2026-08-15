# Shared Win32 machinery for finding a JUCE standalone's editor window.
# Dot-source from a tool script:  . "$PSScriptRoot\PluginWindow.ps1"
#
# Why this exists (hard-won):
#  * JUCE persists windowX/windowY per plugin, so a standalone can restore
#    itself fully off-screen (one of these had windowX=-878 saved) and look
#    like it never opened. Never trust the saved position: find the window by
#    process id and move/capture it explicitly.
#  * JUCE standalones leave Process.MainWindowHandle at 0 for several seconds,
#    so a fixed sleep + GetWindowRect yields a 0x0 rect. Poll EnumWindows for
#    the process's own visible top-level window instead.
#
# The class is one blob shared by every tool: SetWindowPos/ShowWindow are only
# used by launch-examples.ps1, and ClientToScreen/PrintWindow/POINT only by
# capture-plugin.ps1, but splitting them isn't worth two Add-Type blocks.

# Add-Type cannot redefine an already-loaded type, so guard it: dot-sourcing
# this file twice in one session must not error.
if (-not ([System.Management.Automation.PSTypeName]'PluginWindow').Type) {
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PluginWindow {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc e, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int ht, uint flags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  // The >200x>60 client-size heuristic skips the tiny hidden/helper windows a
  // JUCE process creates before (and alongside) the real editor.
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
}

# Polls (every 400ms) until the process shows a real editor window, or the
# timeout passes. Returns the HWND, or [IntPtr]::Zero on timeout.
function Wait-PluginWindow {
  param(
    [Parameter(Mandatory = $true)][int]$ProcessId,
    [int]$TimeoutSec = 40
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 400
    $hwnd = [PluginWindow]::FindVisible([uint32]$ProcessId)
    if ($hwnd -ne [IntPtr]::Zero) { return $hwnd }
  }
  return [IntPtr]::Zero
}
