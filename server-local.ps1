# Zero-dependency PowerShell Web Server for Windows
# Runs natively on all Windows 10 & 11 PCs without installing anything

$Port = 3000
$Prefix = "http://localhost:$Port/"
$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Look for web root
$DistDir = Join-Path $CurrentDir "dist"
if (-not (Test-Path $DistDir)) {
    $DistDir = $CurrentDir
}

$MimeTypes = @{
    ".html"  = "text/html; charset=utf-8"
    ".js"    = "application/javascript; charset=utf-8"
    ".mjs"   = "application/javascript; charset=utf-8"
    ".css"   = "text/css; charset=utf-8"
    ".json"  = "application/json; charset=utf-8"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".svg"   = "image/svg+xml"
    ".ico"   = "image/x-icon"
    ".zip"   = "application/zip"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"   = "font/ttf"
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)

try {
    $Listener.Start()
} catch {
    $Port = 3001
    $Prefix = "http://localhost:$Port/"
    $Listener = New-Object System.Net.HttpListener
    $Listener.Prefixes.Add($Prefix)
    try {
        $Listener.Start()
    } catch {
        $Port = 8080
        $Prefix = "http://localhost:$Port/"
        $Listener = New-Object System.Net.HttpListener
        $Listener.Prefixes.Add($Prefix)
        $Listener.Start()
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       SHIFTLY WORKFORCE PLATFORM - WINDOWS LOCAL SERVER  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Server running at: $Prefix" -ForegroundColor Green
Write-Host "Opening your browser now..." -ForegroundColor Yellow
Write-Host "Keep this window open while using Shiftly. Press Ctrl+C to stop.`n"

Start-Process $Prefix

function Resolve-FilePath($reqPath) {
    $clean = $reqPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    if ([string]::IsNullOrWhiteSpace($clean)) {
        $clean = "index.html"
    }

    # Direct zip downloads
    if ($clean.EndsWith(".zip")) {
        $zipCandidates = @(
            (Join-Path $CurrentDir "shiftly-workforce-code.zip"),
            (Join-Path (Join-Path $CurrentDir "public") "shiftly-workforce-code.zip"),
            (Join-Path (Join-Path $CurrentDir "dist") "shiftly-workforce-code.zip")
        )
        foreach ($z in $zipCandidates) {
            if (Test-Path $z) { return $z }
        }
    }

    # 1. Check in dist
    $p1 = Join-Path $DistDir $clean
    if ((Test-Path $p1) -and -not (Get-Item $p1).PSIsContainer) { return $p1 }

    # 2. Check in current root
    $p2 = Join-Path $CurrentDir $clean
    if ((Test-Path $p2) -and -not (Get-Item $p2).PSIsContainer) { return $p2 }

    # 3. If it's an asset (e.g. assets\abc.js), search in assets directories
    if ($clean.Contains("assets")) {
        $fileName = [System.IO.Path]::GetFileName($clean)
        $p3 = Join-Path (Join-Path $CurrentDir "assets") $fileName
        if ((Test-Path $p3) -and -not (Get-Item $p3).PSIsContainer) { return $p3 }
        $p4 = Join-Path (Join-Path $DistDir "assets") $fileName
        if ((Test-Path $p4) -and -not (Get-Item $p4).PSIsContainer) { return $p4 }
    }

    # 4. Fallback for SPA routing: serve index.html or app.html
    $pIndex = Join-Path $DistDir "index.html"
    if (Test-Path $pIndex) { return $pIndex }

    $pApp = Join-Path $CurrentDir "app.html"
    if (Test-Path $pApp) { return $pApp }

    $pRootIndex = Join-Path $CurrentDir "index.html"
    if (Test-Path $pRootIndex) { return $pRootIndex }

    return $null
}

while ($Listener.IsListening) {
    $Context = $null
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $UrlPath = $Request.Url.LocalPath
        $Resolved = Resolve-FilePath $UrlPath

        if ($Resolved -and (Test-Path $Resolved)) {
            $Ext = [System.IO.Path]::GetExtension($Resolved).ToLower()
            $ContentType = "application/octet-stream"
            if ($MimeTypes.ContainsKey($Ext)) {
                $ContentType = $MimeTypes[$Ext]
            }

            $Bytes = [System.IO.File]::ReadAllBytes($Resolved)
            $Response.StatusCode = 200
            $Response.ContentType = $ContentType
            $Response.ContentLength64 = $Bytes.Length
            $Response.AddHeader("Cache-Control", "no-cache")
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Shiftly is starting up. Please refresh.")
            $Response.StatusCode = 200
            $Response.ContentType = "text/plain"
            $Response.ContentLength64 = $msg.Length
            $Response.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        # Catch all errors so HTTP.sys never sends a 500 error
    } finally {
        if ($Context -and $Context.Response) {
            try {
                $Context.Response.OutputStream.Close()
            } catch {}
        }
    }
}
