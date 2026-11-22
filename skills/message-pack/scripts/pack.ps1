# Prepare a message and its attachment, ready to send.
#
#   pack.ps1 -Name m4-for-raksa -MessageFile D:\x\m4-message.txt `
#            -Files D:\x\report.md, D:\x\slides.md `
#            -Images D:\x\shots\m4-*.png -ImagesFolder screenshots
#
# - No files: message only.
# - Exactly one file: sent as it is (no zip).
# - Several files: zipped, documents at the root and images in a subfolder. -Zip forces a zip.
# Then the message goes on the clipboard (read back to confirm), and:
# - -App paste (default): the message is kept in Win+V clipboard history and the file is put on
#   the clipboard, so Ctrl+V in a chat attaches the file and Win+V pastes the message as caption.
#   Falls back to Explorer when clipboard history is off.
# - -App explorer: Explorer opens with the file selected (drag it in), Ctrl+V = the message.
# - -App none: message on the clipboard only.
# (Telegram's -sendpath was tried and dropped: it ignores the file when Telegram is already open.)
param(
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [string]$MessageFile,
    [string[]]$Files = @(),
    [string[]]$Images = @(),
    [string]$ImagesFolder = "images",
    [string]$OutDir = "",
    [switch]$Zip,
    [ValidateSet("paste", "explorer", "none")] [string]$App = "paste"
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
Add-Type -AssemblyName System.Windows.Forms
Set-Clipboard -Value $text
if ((Get-Clipboard -Raw).TrimEnd() -ne $text) { throw "Clipboard copy did not take. The message is in $MessageFile" }
"CLIPBOARD ok ({0} characters)" -f $text.Length

if (-not $attachment -or $App -eq "none") { return }

function Test-TextInHistory([string]$want) {
    # Reads Windows clipboard history (Win+V) to confirm the message is in it.
    try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $null = [Windows.ApplicationModel.DataTransfer.Clipboard, Windows.ApplicationModel.DataTransfer, ContentType = WindowsRuntime]
        $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
        $run = { param($op, [type]$t) $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(); $task.Result }
        $items = (& $run ([Windows.ApplicationModel.DataTransfer.Clipboard]::GetHistoryItemsAsync()) ([Windows.ApplicationModel.DataTransfer.ClipboardHistoryItemsResult])).Items
        foreach ($i in $items | Select-Object -First 5) {
            if ($i.Content.Contains('Text')) {
                $s = & $run ($i.Content.GetTextAsync()) ([string])
                if ($s.TrimEnd() -eq $want) { return $true }
            }
        }
    } catch { }
    return $false
}

$historyOn = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Clipboard" -Name EnableClipboardHistory -ErrorAction SilentlyContinue).EnableClipboardHistory -eq 1

if ($App -eq "paste" -and $historyOn) {
    # Ctrl+V pastes the file (chat apps attach it); the message waits in Win+V history.
    # (Pasting file and text together doesn't work: Telegram drops the text.)
    Start-Sleep -Milliseconds 1500   # let history record the message as its own item
    if (Test-TextInHistory $text) {
        $list = New-Object System.Collections.Specialized.StringCollection
        [void]$list.Add($attachment)
        [System.Windows.Forms.Clipboard]::SetFileDropList($list)
        "PASTE MODE: Ctrl+V = $(Split-Path -Leaf $attachment); Win+V = the message"
        return
    }
    "Message not found in clipboard history; using File Explorer instead."
} elseif ($App -eq "paste") {
    "Clipboard history (Win+V) is off; using File Explorer instead. Turn it on with Win+V for paste mode."
}
Start-Process explorer.exe -ArgumentList "/select,`"$attachment`""
"EXPLORER MODE: drag $(Split-Path -Leaf $attachment) from the open Explorer window; Ctrl+V = the message"
