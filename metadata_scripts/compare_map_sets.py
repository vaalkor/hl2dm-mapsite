import argparse
import json
 
parser = argparse.ArgumentParser(description='This script augments the map metadata with the category. So we can just look at deathmatch maps.')
parser.add_argument('--master-file', dest='master_file', required=True, help='The current master file to compare other files to')
parser.add_argument('--other-files', dest='other_files', nargs='+', required=True, help='The current master file to compare other files to')
args = parser.parse_args()


with open(args.master_file, 'r') as read_file:
    master_file = json.load(read_file)

other_files = []
for other_file in args.other_files:
    with open(other_file, 'r') as read_file:
        other_files += [{'file_name': other_file, 'data': json.load(read_file)}]

def normalize_map_name(name):
    return name.replace(' ','').replace('_','')

master_map_names = set()
master_map_names_normalized = set()
for map in master_file['MapInfo']: 
    master_map_names.add(map['Name'])
    master_map_names_normalized.add(normalize_map_name(map['Name']))

for other_file_data in other_files:
    file_name = other_file_data['file_name']
    num_files = len(other_file_data['data']['MapInfo'])
    print(f'Map file {file_name} has {num_files} maps in it')

    unique = [x['Name'] for x in other_file_data['data']['MapInfo'] if x['Name'] not in master_map_names]
    print(f'#{len(unique)} map names found in file {file_name}:')
    print(unique)

    print('\n\n')

    normalized_unique = [x['Name'] for x in other_file_data['data']['MapInfo'] if normalize_map_name(x['Name']) not in master_map_names_normalized]
    print(f'#{len(normalized_unique)} normalized unique map names found in file {file_name}:')
    print(normalized_unique)

    print('\n\n')
