import argparse
import requests
import json
import time

parser = argparse.ArgumentParser(description='This script augments the map metadata with the category. So we can just look at deathmatch maps.')
parser.add_argument('--file', dest='file', required=True, help='JSON file to augment')
args = parser.parse_args()


with open(args.file, 'r') as read_file:
    mapFile = json.load(read_file)

count = len(mapFile['MapInfo'])
print(f'Number of maps: {count}')

for mapInfo in mapFile['MapInfo']:
    mapId = mapInfo['Id']

    if 'Category' in mapInfo and 'Files' in mapInfo:
        continue

    response = requests.get(f'https://gamebanana.com/apiv11/Mod/{mapId}/ProfilePage')

    if response.status_code != 200:
        print(f"Failed to retrieve data for map id {mapId} : {response.status_code}")
        break

    responseJson = response.json()
    try:
        category = responseJson['_aCategory']['_sName']
        mapInfo['Category'] = category
        files = list(map(lambda x: {'Name': x['_sFile'], 'Url': x['_sDownloadUrl']}, responseJson['_aFiles']))
        mapInfo['Files'] = list(map(lambda x: {'Name': x['_sFile'], 'Url': x['_sDownloadUrl']}, responseJson['_aFiles'])) 
    except:
        break

    mapName = mapInfo['Name']
    print(f'Retrieved category "{category}" for map "{mapName}"')
    print(f'Retrieved files "{files}" for map "{mapName}"')

    time.sleep(3)


print('Saving file...')

with open(args.file, 'w') as json_file:
    json.dump(mapFile, json_file)
