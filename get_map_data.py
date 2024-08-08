import requests
import json
import datetime
import time

def createSubmussionUrl(page):
    return f'https://gamebanana.com/apiv11/Game/5/Subfeed?_nPage={page}&_sSort=new&_csvModelInclusions=Mod'

# Initial page number
page_number = 1

submissions = []

def get_val(key, mapInfo):
    return mapInfo[key] if key in mapInfo else None

def extract_data_from_map(mapInfo):
    return {
        'Name': mapInfo['_sName'],
        'Id': mapInfo['_idRow'],
        'Added': mapInfo['_tsDateAdded'],
        'Modified': get_val('_tsDateModified', mapInfo),
        'Updated': get_val('_tsDateUpdated', mapInfo),
        'Likes': get_val('_nLikeCount', mapInfo),
        'Views': get_val('_nViewCount', mapInfo),
        'Featured': get_val('_bWasFeatured', mapInfo),
        'Submitter': {
            'Name': mapInfo['_aSubmitter']['_sName'],
            'Id': mapInfo['_aSubmitter']['_idRow']
        }
    }

while True:
    response = requests.get(createSubmussionUrl(page_number))

    if response.status_code != 200:
        print(f"Failed to retrieve data: {response.status_code}")
        break

    items = response.json()

    if not items['_aRecords']:
        break

    submissions += list(map(extract_data_from_map, items['_aRecords']))

    page_number += 1

    print(f'Retrieved {len(submissions)} maps...')

    time.sleep(10)

print(f'Finished retrieving data. {len(submissions)} maps found. Writing JSON file...')

current_time = datetime.datetime.now()
timestamp_str = current_time.strftime("%d_%m_%Y_%H_%M_%S")
filename = f"data_{timestamp_str}.json"

with open(filename, 'w') as json_file:
    json.dump({'MapInfo': submissions}, json_file)