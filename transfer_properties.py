import json
with open('new_data_master_copy.json', 'r') as read_file:
    new_data = json.load(read_file)

with open('scrape_data.json', 'r') as read_file:
    old_data = json.load(read_file)

def old_map_id(old_map):
    return old_map['Link'].replace('https://gamebanana.com/mods/','')

def copy_property(name, new_map, old_map):
    if name in old_map:
        new_map[name] = old_map[name]

foundCount = 0
notFoundCount = 0
new_data['MapInfo'] = [x for x in new_data['MapInfo'] if x['Category'] == 'Deathmatch']
for map in new_data['MapInfo']:
    id = str(map['Id'])
    old_map = next((x for x in old_data['MapInfo'] if old_map_id(x) == id), None)

    if not old_map:
        notFoundCount += 1
        continue
    else:
        foundCount += 1
    
    copy_property('InitialRatingTimestamp', map, old_map)
    copy_property('RobLabels', map, old_map)
    copy_property('RobRating', map, old_map)

old_data['MapInfo'] = new_data['MapInfo']

print('Not found: ', notFoundCount)
print('Found count: ', foundCount)
print('Overwriting old scrape data file...')

with open('scrape_data.json', 'w') as json_file:
    json.dump(old_data, json_file, indent=4)
