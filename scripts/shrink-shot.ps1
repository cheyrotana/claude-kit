# Shrink a screenshot to a small JPEG for task attachments.
# Usage: powershell -NoProfile -File shrink-shot.ps1 <in.png> <out.jpg> [maxWidth=720] [quality=60]
param([string]$In, [string]$Out, [int]$MaxWidth = 720, [int]$Quality = 60)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
try {
  $w = [Math]::Min($MaxWidth, $src.Width)
  $h = [int]($src.Height * $w / $src.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($src, 0, 0, $w, $h)
  $g.Dispose()
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)
  $bmp.Save($Out, $codec, $params)
  $bmp.Dispose()
} finally { $src.Dispose() }
"{0} -> {1} ({2:N0} KB)" -f (Split-Path $In -Leaf), (Split-Path $Out -Leaf), ((Get-Item $Out).Length / 1KB)
