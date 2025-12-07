[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateScript({
        if (-not (Test-Path $_)) {
            throw "File '$_' does not exist."
        }
        if ($_ -notlike "*.json") {
            throw "File '$_' must have a .json extension."
        }
        return $true
    })]
    [string]$JsonFile
)

Write-Host "Processing file: $JsonFile"

$mapInfo = (Get-Content -Path $JsonFile | ConvertFrom-Json)

# Set authors in cases where there is only one author automatically, which covers the majority of maps
foreach($map in $mapInfo.MapInfo){
    if($map.Authors -or $map.Authors.Count -gt 0){ # Author already set, skip
        continue
    }
    $individualCredits = $map.Credits._aAuthors._sName
    if($individualCredits.Count -eq 1){
        $map | Add-Member -MemberType NoteProperty -Name Authors -Value @($individualCredits) -Force
    }
}

# Ask user to set authors for maps with multiple authors
foreach($map in ($mapInfo.MapInfo | Where-Object { $_.Authors -eq $null })){
    $skip = $false
    Write-Host "Select the author(s) for map: $($map.Name)"
    Write-Host "Specify the authors by index (comma-separated if multiple):"
    Write-Host "Enter an empty input to end the script and save the pending changes... Enter - to skip this map"

    Write-Host "==============================="
    Write-Host ($map.Credits | ConvertTo-Json -Depth 10)
    Write-Host "==============================="
    $quit = $false
     
    $individualCredits = $map.Credits._aAuthors._sName
    for($i = 1; $i -le $individualCredits.Count; $i++){
        Write-Host "[$i] $($individualCredits[$i-1])"
    }
    
    do {
        $selectedIndices = Read-Host "Enter author indices"
        if(-not $selectedIndices){
            Write-Host "Ending script and saving changes..." -ForegroundColor Yellow
            $quit = $true
            break
        }
        if ($selectedIndices -eq "-") {
            break
        }
        $valid = $selectedIndices -match '^(\d+)(,\d+)*$' 
        $valid = $valid -and ($selectedIndices -split "," | ForEach-Object { ($_ -as [int]) -ge 1 -and ($_ -as [int]) -le $individualCredits.Count }) -notcontains $false
        if (-not $valid) {
            Write-Host "Invalid input. Please enter a single number or comma-separated numbers." -ForegroundColor Red
        }
    } while (-not $valid)
    
    if($quit){
        break
    }
    if($skip){
        Write-Host "Skipping map: $($map.Name)" -ForegroundColor Yellow
        continue
    }
    if($selectedIndices -eq "-"){
        $selectedAuthors = @()
    }else{
        $selectedAuthors = $selectedIndices -split "," | ForEach-Object { $individualCredits[$_-1] }
    }
    Write-Host "new selected authors: $selectedAuthors"
    $map | Add-Member -MemberType NoteProperty -Name Authors -Value @($selectedAuthors) -Force
}


Write-Host "Saving updated file: $JsonFile"
$mapInfo | ConvertTo-Json -Depth 10 | Set-Content -Path $JsonFile
node .\metadata_scripts\resave_json.js