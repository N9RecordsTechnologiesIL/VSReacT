# Drives the phase-2 StashTrack UI: seeds stash history with real little WAVs,
# opens the drawer, scrolls it, loads an entry, toggles preview. Screenshots
# land in verify-phase2/.
param([string]$OutDir = "H:\code\11Tools\VSReacT\verify-phase2")

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class P2Drive {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force $OutDir | Out-Null

# --- Seed stash history with three valid (silent) WAV files -----------------
function Write-Wav($path, $seconds) {
  $rate = 44100
  $samples = [int]($rate * $seconds)
  $dataSize = $samples * 2
  $stream = [System.IO.File]::Create($path)
  $writer = New-Object System.IO.BinaryWriter($stream)
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes("RIFF"))
  $writer.Write([int](36 + $dataSize))
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes("WAVEfmt "))
  $writer.Write([int]16); $writer.Write([int16]1); $writer.Write([int16]1)
  $writer.Write([int]$rate); $writer.Write([int]($rate * 2))
  $writer.Write([int16]2); $writer.Write([int16]16)
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes("data"))
  $writer.Write([int]$dataSize)
  # Quiet 440 Hz sine so the waveform isn't empty.
  for ($i = 0; $i -lt $samples; $i++) {
    $writer.Write([int16]([math]::Sin($i * 2 * [math]::PI * 440 / $rate) * 8000))
  }
  $writer.Close()
}

$wavDir = Join-Path $env:TEMP "StashTrackP2Wavs"
New-Item -ItemType Directory -Force $wavDir | Out-Null
$names = @("Late Night Chords.wav", "Vinyl Drum Break.wav", "Analog Bass Stab.wav",
           "Tape Choir Pad.wav", "Granular Sparkles.wav", "Lo-Fi Keys Loop.wav",
           "Dusty Rhodes Riff.wav", "Ambient Field Rec.wav")
$entries = @()
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
foreach ($name in $names) {
  $path = Join-Path $wavDir $name
  Write-Wav $path 2.0
  $entries += @{ path = $path; name = $name; addedMs = $stamp }
  $stamp -= 3600000
}
$historyDir = Join-Path $env:APPDATA "StashTrack"
New-Item -ItemType Directory -Force $historyDir | Out-Null
($entries | ConvertTo-Json -Compress) | Set-Content -Encoding utf8 (Join-Path $historyDir "history.json")

# --- Launch and drive --------------------------------------------------------
function Snap($hwnd, $name) {
  $r = New-Object P2Drive+RECT
  [P2Drive]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  $bmp = New-Object System.Drawing.Bitmap(($r.Right - $r.Left), ($r.Bottom - $r.Top))
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [P2Drive]::PrintWindow($hwnd, $hdc, 2) | Out-Null
  $g.ReleaseHdc($hdc); $g.Dispose()
  $bmp.Save((Join-Path $OutDir "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function ClickAt($hwnd, $cx, $cy) {
  [P2Drive]::SetForegroundWindow($hwnd) | Out-Null
  Start-Sleep -Milliseconds 150
  $r = New-Object P2Drive+RECT
  [P2Drive]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  [P2Drive]::SetCursorPos($r.Left + $cx, $r.Top + $cy) | Out-Null
  Start-Sleep -Milliseconds 200
  [P2Drive]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [P2Drive]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 400
}

function WheelAt($hwnd, $cx, $cy, $notches) {
  [P2Drive]::SetForegroundWindow($hwnd) | Out-Null
  Start-Sleep -Milliseconds 150
  $r = New-Object P2Drive+RECT
  [P2Drive]::GetWindowRect($hwnd, [ref]$r) | Out-Null
  [P2Drive]::SetCursorPos($r.Left + $cx, $r.Top + $cy) | Out-Null
  Start-Sleep -Milliseconds 200
  for ($i = 0; $i -lt [math]::Abs($notches); $i++) {
    $delta = if ($notches -lt 0) { [uint32]4294967176 } else { [uint32]120 }  # -120 as uint
    [P2Drive]::mouse_event(0x0800, 0, 0, $delta, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 80
  }
  Start-Sleep -Milliseconds 300
}

$exe = "H:\code\11Tools\VSReacT\StashTrack\build-vs\StashTrack_artefacts\Release\Standalone\StashTrack.exe"
$proc = Start-Process $exe -PassThru
Start-Sleep -Seconds 3
$proc.Refresh()
$hwnd = $proc.MainWindowHandle
[P2Drive]::SetForegroundWindow($hwnd) | Out-Null

# Let the splash finish.
Start-Sleep -Milliseconds 3200
Snap $hwnd "1-main"

# Open the stash drawer (header pill, top right).
ClickAt $hwnd 660 64
Start-Sleep -Milliseconds 500
Snap $hwnd "2-drawer-open"

# Wheel-scroll the list.
WheelAt $hwnd 560 300 -4
Snap $hwnd "3-drawer-scrolled"

# Scroll back up and load the first entry.
WheelAt $hwnd 560 300 6
ClickAt $hwnd 560 160
Start-Sleep -Milliseconds 700
Snap $hwnd "4-entry-loaded"

# Close the drawer (backdrop click, far left).
ClickAt $hwnd 120 300
Start-Sleep -Milliseconds 500
Snap $hwnd "5-loaded-main"

# Toggle preview (PLAY pill on the waveform card header).
ClickAt $hwnd 530 268
Start-Sleep -Milliseconds 900
Snap $hwnd "6-preview-playing"

Stop-Process -Id $proc.Id -Force
"done"
