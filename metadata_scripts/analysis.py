import json
with open('new_data_master_copy.json', 'r') as read_file:
    new_data = json.load(read_file)

with open('scrape_data.json', 'r') as read_file:
    old_data = json.load(read_file)

new_data_ids = {}
new_data_names = {}

old_data_ids = {}
old_data_names = {}

for map in new_data['MapInfo']:
    new_data_ids[str(map['Id'])] = map
    new_data_names[map['Name']] = map

for map in old_data['MapInfo']:
    old_data_ids[map['Link'].replace('https://gamebanana.com/mods/','')] = map
    old_data_names[map['Name']] = map

print([x for x in old_data_ids.keys() if x not in new_data_ids.keys()])
print([x for x in old_data_names.keys() if x not in new_data_names.keys()])
print([x for x in old_data_ids.keys() if x in new_data_ids.keys() and new_data_ids[x]['Name'] != old_data_ids[x]['Name']])
