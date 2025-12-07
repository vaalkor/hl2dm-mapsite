[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$SourceFolder,
    
    [Parameter(Mandatory=$true)]
    [string]$TargetFolder
)

$ErrorActionPreference = "Stop"

$7zPath = "C:\Program Files\7-Zip\7z.exe"
if (-not (Test-Path $7zPath)) {
    Write-Error "7z.exe not found at $7zPath"
    exit 1
}

if (-not (Test-Path $SourceFolder)) {
    Write-Error "Source folder does not exist: $SourceFolder"
    exit 1
}

# Get all archives in source folder
$archives = Get-ChildItem -Path $SourceFolder -Filter *.zip
$archives += Get-ChildItem -Path $SourceFolder -Filter *.rar
$archives += Get-ChildItem -Path $SourceFolder -Filter *.7z

foreach ($archive in $archives) {
    Write-Host "Processing: $($archive.Name)"
    & $7zPath x "$($archive.FullName)" "-o$TargetFolder" -y | Out-Null
}

Write-Host "Extraction complete!"