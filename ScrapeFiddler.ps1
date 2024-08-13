param(
[string]$ScrapeDataFile="scrape_data.json",
[string]$MapsFolder="E:\Steam\steamapps\common\Half-Life 2 Deathmatch\hl2mp\maps",

[switch]$UpdateInfo,
[switch]$GetInfo,
[string]$Description,
[Parameter()]
[ValidateSet('CausesCrash','Duel', 'Outdoors','Indoors', 'NoTripmines', 'TooBig', 'Small', 'Medium', 'Large', 'Meme', 'NeverLoads', 'LowGrav', 'Remake', 'Incomplete', 'VanillaStyle', 'UT', 'Quake', 'HL1', 'MissingTextures', 'UniqueMechanic', 'KingOfTheHill')] 
[string[]]$Labels,
[Parameter()]
[ValidateSet(0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)] 
[decimal]$Rating,
[string]$MapName,
[string]$MapUrl,
[int]$NumPlayers,
[switch]$RemoveLabels,
[switch]$GetRandomMap,
[switch]$ListMaps,
[switch]$CountMaps,
[switch]$NoRating,
[switch]$NoDescription,
[switch]$NoLabels,
[switch]$MapNameFromClip,
[string]$NewestMapToConsider
)

$file = Get-Item $ScrapeDataFile
if(-not $file){
    "Cannot read $ScrapeDataFile. Quitting..."
    exit 1
}

$json = Get-Content $file | ConvertFrom-Json
if(-not $json){
    "Cannot parse $ScrapeDataFile as json. Quitting..."
    exit 1
}

if(-not ($UpdateInfo -or $GetInfo -or $GetRandomMap -or $ListMaps -or $CountMaps)){
    "No action specified. Qutting..." 
    exit 1
}


if($MapNameFromClip){ $MapName = Get-Clipboard }

function GetUnixTime(){
    return [int64](([datetime]::UtcNow)-(get-date "1/1/1970")).TotalSeconds
}

function GetMapWithName($name){
    $filtered = $json.MapInfo | ?{$_.Name -eq $name}
    if(-not $filtered){"Cannot find map with $name"; exit 1}
    if($filtered -is [array]){"Cannot get unique map $name. Map name is duplicated!"; exit 1}
    return $filtered
}

function GetMapWithURL($url){
    $filtered = $json.MapInfo | ?{$_.Link -eq $url}
    if(-not $filtered){"Cannot find map with URL $url"; exit 1}
    if($filtered -is [array]){"Cannot get unique map with URL $url. Map is duplicated!"; exit 1}
    return $filtered
}

function GenerateGraphData(){
    $timestamps = $json.MapInfo | ?{$_.InitialRatingTimestamp} | %{$_.InitialRatingTimestamp} | Sort-Object | Get-Unique
    $timestampCounts = @{}
    $timestamps | %{$timestampCounts[$_] = 0}
    $json.MapInfo | ?{$_.InitialRatingTimestamp} | %{$_.InitialRatingTimestamp} | %{$timestampCounts[$_]+=1}

    $total = 0
    $graphData = @()
    $timestamps | %{
        $graphData += ,($_, ($timestampCounts[$_]+$total))
        $total+=$timestampCounts[$_]
    }
    $json | Add-Member -MemberType NoteProperty -Name 'MapRatingGraphData' -Value $graphData -Force
}

"Total maps in file: $($json.MapInfo | measure | select -ExpandProperty count)"

if($GetRandomMap -or $ListMaps -or $CountMaps){
    $filteredMaps = $json.MapInfo
    if($NoRating)       { $filteredMaps  = $filteredMaps | ?{-not $_.RobRating}}
    if($NoDescription)  { $filteredMaps  = $filteredMaps | ?{-not $_.RobDescription}}
    if($NoLabels)       { $filteredMaps  = $filteredMaps | ?{-not $_.RobLabels}}

    if($Labels) { 
        $filteredMaps  = $filteredMaps | ?{$_.RobLabels -and ($_.RobLabels | ?{$Labels.Contains($_)}).Count -eq $Labels.Count}
    }

    if($NewestMapToConsider){
        $newestMapFound = $json.MapInfo | ? {$_.Name -eq $NewestMapToConsider}
        if(-not $newestMapFound){
            "The `$NewestMapToConsider you provided was not found, so will be ignored..."
        }else{
            $filteredMaps = $filteredMaps | ?{$_.Added -le $newestMapFound.Added}
        }
    }

    if(-not $filteredMaps){ "No maps found!"; exit 1}

    "============================`n$($filteredMaps | measure | select -ExpandProperty Count) found with properties
     
NoRating: $NoRating
NoDescription: $NoDescription
NoLabels: $NoLabels
Labels: $Labels
Newest Map: $NewestMapToConsider`n============================"

    if($GetRandomMap){
        $randomMap = $filteredMaps | Get-Random
        "$($randomMap.Name) copied to clipboard!"
        if(-not (ls -Recurse $MapsFolder | ?{$_.Name -eq "$($randomMap.Name).bsp"})){
            "WARNING! No map with name `"$($randomMap.Name).bsp`" found in maps folder: $MapsFolder"
        }
        $randomMap.Name | Set-Clipboard
    }
    elseif($ListMaps){$filteredMaps}

    exit 0
}

if($CheckDuplicatesNames){
    $tempDict = @{}
    $json.MapInfo | %{
        if($tempDict.ContainsKey($_.Name)){ "Found duplicate map name: $($_.Name)"}
        $tempDict[$_.Name] = 1
    }
    exit 0
}

if($GetInfo){
    if(-not $MapName){"GetInfo set but no MapName provided. Quitting..."; exit 1}
    GetMapWithName($MapName)    
    exit 0
}

if($UpdateInfo){
    if($MapName -and $MapUrl){"Both MapName and MapUrl provided. Use one or the other..."; exit 1}
    if(-not $MapName -and -not $MapUrl){"Neither MapName nor MapUrl provided. Use one or the other..."; exit 1}
    if($MapName){$updateInfoMap = GetMapWithName($MapName)}
    else{$updateInfoMap = GetMapWithURL($MapUrl)}

    if($Rating){$updateInfoMap | Add-Member -MemberType NoteProperty -Name 'RobRating' -Value $Rating -Force}
    if($Description){$updateInfoMap | Add-Member -MemberType NoteProperty -Name 'RobDescription' -Value $Description -Force}
    if($Labels){
        if(-not $updateInfoMap.RobLabels){
            if($RemoveLabels){
                "RemoveLabels specified, but map $MapName has no labels... Nothing to do."
                exit 1
            }
            $updateInfoMap | Add-Member -MemberType NoteProperty -Name 'RobLabels' -Value $Labels -Force
        }else{
            if($RemoveLabels){ $updateInfoMap.RobLabels = $updateInfoMap.RobLabels | ?{-not $Labels.Contains($_)} }
            else{ $updateInfoMap.RobLabels += ($Labels | ?{-not $updateInfoMap.RobLabels.Contains($_)}) }
        }
    }
    if($NumPlayers){ $updateInfoMap | Add-Member -MemberType NoteProperty -Name 'NumPlayers' -Value $NumPlayers -Force }
    if(-not $updateInfoMap.InitialRatingTimestamp){
        echo "No rating!"
        $updateInfoMap | Add-Member -MemberType NoteProperty -Name 'InitialRatingTimestamp' -Value (GetUnixTime) -Force
    }

    "Updated map info:"
    $updateInfoMap
    
    GenerateGraphData

    "Writing updated data to $ScrapeDataFile"

    $json | ConvertTo-Json -Depth 10 -Compress | Set-Content -Path $ScrapeDataFile
    python "$PSscriptRoot\metadata_scripts\resave_json.py" --file $ScrapeDataFile

    exit 0
}

