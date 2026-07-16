# Publishes the StashTrack v0.7 GitHub release with both installer assets.
$ErrorActionPreference = "Stop"

$repo = "N9RecordsTechnologiesIL/StashTrack"
$tag = "v0.7"
$installer = "H:\code\11Tools\VSReacT\StashTrack\dist\StashTrackv0.7Setup.exe"

# Token from Git Credential Manager (never printed).
$credLines = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = ($credLines | Where-Object { $_ -like "password=*" }) -replace "^password=", ""
if (-not $token) { throw "No GitHub token available from the credential manager." }

$headers = @{
  Authorization          = "Bearer $token"
  Accept                 = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$notes = @'
## StashTrack v0.7

The entire plugin UI is now a modern React 18 + TypeScript app rendered natively inside the VST by the new VSReacT framework (QuickJS + custom React reconciler + Yoga flexbox + JUCE-painted pixels — no webview).

### What's new
- Complete UI redesign: animated equalizer logo, status chip with live tones, elevated cards, monospace URL field with focus ring, glowing DOWNLOAD button with animated fetching state, progress hairline, clip range toggle switch, waveform READY/DRAG TO PLAYLIST badges.
- Hover, press, and focus feedback on every control; pointer cursors.
- Same trusted pipeline underneath: yt-dlp/ffmpeg download, clip ranges, waveform preview, and native file drag into the FL Studio playlist.

### Notes
- The installer bundles yt-dlp, uv/uvx, ffmpeg, deno, and the VC++ runtime as before.
- Close FL Studio before finishing the installer so the loaded VST3 can be replaced.
'@

# Reuse the existing release for the tag if a previous run already created it.
$existing = $null
try {
  $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$tag" -Headers $headers
} catch {}

if ($existing) {
  $release = $existing
  Write-Host "Release $tag already exists (id $($release.id)); reusing."
} else {
  $body = @{
    tag_name         = $tag
    target_commitish = "main"
    name             = "StashTrack v0.7"
    body             = $notes
    draft            = $false
    prerelease       = $false
  } | ConvertTo-Json
  $release = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$repo/releases" -Headers $headers -Body $body -ContentType "application/json"
  Write-Host "Created release $tag (id $($release.id))."
}

$uploadBase = $release.upload_url -replace "\{\?name,label\}", ""

foreach ($assetName in @("StashTrackv0.7Setup.exe", "StashTrackSetup.exe")) {
  $already = $release.assets | Where-Object { $_.name -eq $assetName }
  if ($already) {
    Write-Host "Asset $assetName already uploaded; skipping."
    continue
  }
  Write-Host "Uploading $assetName..."
  Invoke-RestMethod -Method Post -Uri "$uploadBase`?name=$assetName" -Headers $headers -InFile $installer -ContentType "application/octet-stream" | Out-Null
  Write-Host "Uploaded $assetName."
}

$final = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$tag" -Headers $headers
Write-Host "Release: $($final.html_url)"
Write-Host ("Assets: " + (($final.assets | ForEach-Object { "$($_.name) ($([math]::Round($_.size/1MB,1)) MB)" }) -join ", "))
