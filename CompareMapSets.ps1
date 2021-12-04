param(
    [Parameter(Mandatory=$true)][string]$PrimaryMapFile,
    [Parameter(Mandatory=$true)][string]$SeconaryMapFile,
    [switch]$CompareAlphaNumericsOnly
)

$ErrorActionPreference = 'Stop'

function toAlphaNumeric($value){ $value -replace '[^a-zA-Z0-9]', '' }

$primary    = get-content $PrimaryMapFile | ConvertFrom-Json
$secondary  = get-content $SeconaryMapFile | ConvertFrom-Json

$primaryHashSet     = @{}
$secondaryHashSet   = @{}

$primary.MapInfo | %{ $primaryHashSet[$_.Name] = 1 }
$secondary.MapInfo | %{ $secondaryHashSet[$_.Name] = 1 }


if($CompareAlphaNumericsOnly){
    $primaryAlphaNumericKeyMap = @{}
    $secondaryAlphaNumericKeyMap = @{}
    $primaryHashSet.Keys | %{ $primaryAlphaNumericKeyMap[(toAlphaNumeric $_)] = $_ }
    $secondaryHashSet.Keys | %{ $secondaryAlphaNumericKeyMap[(toAlphaNumeric $_)] = $_ }
}

if($CompareAlphaNumericsOnly){
    $secondaryAlphaNumericKeyMap.Keys `
        | ?{-not $primaryAlphaNumericKeyMap.ContainsKey($_)}`
        | %{$secondaryAlphaNumericKeyMap[$_]}
    exit 0
}

$secondaryHashSet.Keys | ?{ -not $primaryHashSet.ContainsKey($_) }
