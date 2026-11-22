# Prepare a message and its attachment, ready to send.
#
#   pack.ps1 -Name m4-for-raksa -MessageFile D:\x\m4-message.txt `
#            -Files D:\x\report.md, D:\x\slides.md `
#            -Images D:\x\shots\m4-*.png -ImagesFolder screenshots
#
# - No files: message only.
# - Exactly one file: sent as it is (no zip).
# - Several files: zipped, documents at the root and images in a subfolder. -Zip forces a zip.
# Then the message goes on the clipboard (read back to confirm), and the attachment is opened
# in Telegram Desktop's send window (-App telegram, the default) or selected in File Explorer
# (-App explorer, or when Telegram isn't installed). -App none opens nothing.
param(
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [string]$MessageFile,
    [string[]]$Files = @(),
    [string[]]$Images = @(),
    [string]$ImagesFolder = "images",
    [string]$OutDir = "",
    [switch]$Zip,
    [ValidateSet("telegram", "explorer", "none")] [string]$App = "telegram"
)
$ErrorActionPreference = "Stop"

function Resolve-All([string[]]$patterns) {
    $out = @()
    foreach ($p in $patterns) {
        $hits = @(Resolve-Path -Path $p -ErrorAction SilentlyContinue)
        if ($hits.Count -eq 0) { throw "No file matches: $p" }
        $out += $hits | ForEach-Object { $_.ProviderPath }
    }
    return $out
}

if (-not (Test-Path $MessageFile)) { throw "Message file not found: $MessageFile" }
$MessageFile = (Resolve-Path $MessageFile).ProviderPath
if (-not $OutDir) { $OutDir = Split-Path -Parent $MessageFile }

$docs = @(Resolve-All $Files)
$imgs = @(Resolve-All $Images)
$all = @($docs + $imgs)
$attachment = $null

if ($all.Count -eq 1 -and -not $Zip) {
    $attachment = $all[0]
    "ATTACH {0} ({1:N1} MB, sent as it is)" -f $attachment, ((Get-Item $attachment).Length / 1MB)
} elseif ($all.Count -gt 0) {
    $stage = Join-Path $env:TEMP ("pack-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
    New-Item -ItemType Directory -Force $stage | Out-Null
    try {
        foreach ($d in $docs) { Copy-Item $d $stage }
        if ($imgs.Count -gt 0) {
            $imgDir = Join-Path $stage $ImagesFolder
            New-Item -ItemType Directory -Force $imgDir | Out-Null
            foreach ($i in $imgs) { Copy-Item $i $imgDir }
        }
        $attachment = Join-Path $OutDir "$Name.zip"
        if (Test-Path $attachment) { Remove-Item $attachment -Confirm:$false }
        Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $attachment
    } finally {
        Remove-Item -Recurse -Force $stage -Confirm:$false
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $z = [IO.Compression.ZipFile]::OpenRead($attachment)
    try { $z.Entries | ForEach-Object { "{0,10:N0}  {1}" -f $_.Length, $_.FullName } } finally { $z.Dispose() }
    "ATTACH {0} ({1:N1} MB, zip)" -f $attachment, ((Get-Item $attachment).Length / 1MB)
} else {
    "No attachment: message only."
}
if ($attachment -and ((Get-Item $attachment).Length / 1MB) -gt 20) { "WARNING: over 20 MB; email may refuse it (Telegram is fine up to 2 GB)." }

$text = [IO.File]::ReadAllText($MessageFile, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF).TrimEnd()

# Chat apps turn "report.md" into a link to a website (.md is a country domain), so flag
# file names whose extension is also a web address ending. Real URLs (http...) are fine.
$noUrls = [regex]::Replace($text, 'https?://\S+', '')
$linky = [regex]::Matches($noUrls, '\b[\w-]+\.(md|sh|py|ai|io|me|co|js|ts|zip|app|dev|rs|pl)\b') | ForEach-Object { $_.Value } | Select-Object -Unique
if ($linky) { "WARNING: these will show as links in chat apps: $($linky -join ', '). Drop the extension." }
if ($attachment -and $text.Length -gt 1024) {
    "WARNING: message is {0} characters; a Telegram caption holds 1024. Shorten it or send it separately." -f $text.Length
}

# Clipboard last, so nothing else in this run overwrites it, and read back to confirm.
Set-Clipboard -Value $text
if ((Get-Clipboard -Raw).TrimEnd() -ne $text) { throw "Clipboard copy did not take. The message is in $MessageFile" }
"CLIPBOARD ok ({0} characters)" -f $text.Length

if (-not $attachment -or $App -eq "none") { return }

$telegram = @(
    "$env:APPDATA\Telegram Desktop\Telegram.exe",
    "$env:LOCALAPPDATA\Programs\Telegram Desktop\Telegram.exe",
    "C:\Program Files\Telegram Desktop\Telegram.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($App -eq "telegram" -and $telegram) {
    # Telegram's own "send this file" entry point: it asks for the chat, with the file attached.
    Start-Process $telegram -ArgumentList '-sendpath', "`"$attachment`""
    "OPENED Telegram with the attachment"
} else {
    if ($App -eq "telegram") { "Telegram Desktop not found; opening File Explorer instead." }
    Start-Process explorer.exe -ArgumentList "/select,`"$attachment`""
    "OPENED File Explorer with the attachment selected"
}
