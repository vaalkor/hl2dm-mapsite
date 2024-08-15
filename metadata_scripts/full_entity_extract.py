import argparse
from hl2_utils import open_json_file, write_json_file, get_directory_throw_no_exists, get_file_throw_no_exists
import plumbum
from pathlib import Path
from os import linesep
import json
import bsp_tool

parser = argparse.ArgumentParser(description='This script augments the map metadata with the category. So we can just look at deathmatch maps.')
parser.add_argument('-mif', '--map-info-file', dest='map_info_file', required=True, help='Map metadata file')
parser.add_argument('-tef', '--temp-extract-folder', dest='temp_extract_folder', required=True, help='A folder to do a temporary extraction to')

args = parser.parse_args()

temp_extract_folder = get_directory_throw_no_exists(args.temp_extract_folder)
map_data = open_json_file(args.map_info_file)

def is_single_file_map(map_info): return len(map_info['Files']) == 1

def get_single_file_maps(map_data): return (x for x in map_data['MapInfo'] if is_single_file_map(x))

def get_init_extract_folder(map_info): return temp_extract_folder/map_info['Files'][0]['Name']

def increment_dict(dict, key):
    if key in dict: dict[key]+=1
    else: dict[key] = 1


count = 0

total_maps_looked_at = 0
if not Path('full_entity_data.json').exists():
    full_entity_data = {}
else:
    full_entity_data = open_json_file('full_entity_data.json')

for map_info in get_single_file_maps(map_data):
    if 'Failed Init Extract' in map_info:
        continue
    
    if map_info['Name'] in full_entity_data:
        continue

    extract_folder = get_init_extract_folder(map_info)

    map_name = map_info['Name']
    map_files = list(extract_folder.iterdir())

    bsp_files = list(extract_folder.glob('**/*.bsp'))
    map_info['BspFiles'] = list(map(lambda x: x.name, bsp_files))
    
    bsp_count = len(bsp_files)
    if bsp_count > 1 or bsp_count == 0: 
        print(f'Map "{map_name}", with map folder: "{extract_folder}", has {bsp_count} bsp files.')

    if bsp_count == 1:
        bsp_file = bsp_files[0]

        try:
            entity_count = {}
            bsp = bsp_tool.load_bsp(str(bsp_file))
            for entity in bsp.ENTITIES:
                increment_dict(entity_count, entity['classname'])
                      
            full_entity_data[map_info['Name']] = entity_count

            print(f'Writing file after reading map ${map_name}')

            write_json_file('full_entity_data.json', full_entity_data)
        except Exception as e:
            print(e)
            print(f'Could not use bsp_tool to analyse map {map_name} with file name {bsp_file}')
            map_info['Bsp Tool Failed'] = 1
