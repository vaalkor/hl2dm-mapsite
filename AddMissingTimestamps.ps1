function IsRated($map){ return $map.RobRating -or $map.RobLabels}

if(-not (Test-Path 'scrape_data.json'))
{
    'Cannot find scrape_data.json'
    exit 1
}

$data = gc .\scrape_data.json | ConvertFrom-Json
$isRatedLookup = @{}
$mapLookup = @{}
$data.MapInfo | %{$mapLookup.Add($_.Link, $_)}
$data.MapInfo | %{$isRatedLookup.Add($_.Link, (IsRated $_))}

$numCommits = (git log --oneline).Count

$history =
    0..($numCommits-1) |
    %{git show HEAD~$($_):scrape_data.json | ConvertFrom-Json} |
    %{
        $mapRatedDict = @{} 
        $_.MapInfo | 
            ?{$isRatedLookup[$_.Link] -and (-not $_.InitialRatingTimestamp)} |
            %{$mapRatedDict.Add($_.Link, (IsRated $_))}
        $mapRatedDict
    }
$history+= @(@{})

$timestamps = @{}
0..($numCommits-1) | %{$timestamps.Add($_, (git show -s --format=%ct HEAD~$($_)))}


foreach($commitNum in ($numCommits-1)..0)
{
    $numUnrated = ($history[$commitNum] | ?{-not($_.RobRating -or $_.RobLabels)}).Count
    "Commit HEAD~$commitNum number unrated: $numUnrated"
    foreach($mapUrl in $history[$commitNum].Keys)
    {
        if($history[$commitNum][$mapUrl] -and (-not $history[$commitNum+1][$mapUrl]))
        {
            $mapLookup[$mapUrl] | Add-Member -MemberType NoteProperty -Name 'InitialRatingTimestamp' -Value $timestamps[$commitNum] -Force
        }
    }
}

$data | ConvertTo-Json -Depth 20 | Set-Content .\scrape_data.json