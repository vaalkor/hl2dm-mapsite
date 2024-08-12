import argparse
from hl2_utils import open_json_file, write_json_file, get_directory_throw_no_exists, get_file_throw_no_exists
import plumbum
from pathlib import Path
from os import linesep
import json
import bsp_tool

parser = argparse.ArgumentParser(description='This script augments the map metadata with the category. So we can just look at deathmatch maps.')
parser.add_argument('-mif', '--map-info-file', dest='map_info_file', required=True, help='Map metadata file')
parser.add_argument('-df', '--download_folder', dest='download_folder', required=True, help='The location of the downloads')
parser.add_argument('-tef', '--temp-extract-folder', dest='temp_extract_folder', required=True, help='A folder to do a temporary extraction to')
parser.add_argument('-def', '--destination-extract-folder', dest='destination_extract_folder', required=True, help='A folder to do a final extraction to')
parser.add_argument('-7zp', '--7z-path', dest='zip_path', default='C:\\Program Files\\7-Zip\\7z.exe', required=False, help='7zip executable path')
parser.add_argument('-j', '--job', choices=['init_extract', 'analysis', 'final_extract', 'extract_archived_maps'], required = True, help="What task to perform. 'init_extract' just extracts each map into a folder with the same name as the archive. 'analysis' then does a bit of analysis of what was extracted in the first pass. 'final_extact' then tries to properly extract all of the maps.\nextract_archived_maps Extracts folders that contain a further archive.")
args = parser.parse_args()

temp_extract_folder = get_directory_throw_no_exists(args.temp_extract_folder)
destination_extract_folder = get_directory_throw_no_exists(args.destination_extract_folder)
download_folder = get_directory_throw_no_exists(args.download_folder)
get_file_throw_no_exists(args.zip_path)

map_data = open_json_file(args.map_info_file)

errored_files = []
failed_extractions = []

def folder_has_archive(folder): return next((x for x in folder.iterdir() if x.suffix in ['.rar', '.bz2', '.zip']), None)

def folder_has_subfolders(folder): return next((x for x in folder.iterdir() if x.is_dir()), None)

def is_single_file_map(map_info): return len(map_info['Files']) == 1

def get_single_file_maps(map_data): return (x for x in map_data['MapInfo'] if is_single_file_map(x))

def get_init_extract_folder(map_info): return temp_extract_folder/map_info['Files'][0]['Name']

def get_archive_info(filename):
    global errored_files
    zip_command = plumbum.local[args.zip_path]
    try:
        files = []
        zip_output = zip_command['l', '-slt', '-ba', filename]().strip(linesep)

        def extract_line(line): split = line.partition(' = '); return (split[0], split[2])

        for file_info in zip_output.split(linesep+linesep): # different files are separated by 2 newlines chars in a row
            files += [dict(map(lambda x: extract_line(x), file_info.split(linesep) ))]
        
        return True, files
    except plumbum.commands.processes.ProcessExecutionError as e:
        # print(f'Error trying to inspect file {filename}. Error message: {e.message}')
        errored_files += [filename]
        return False, None

def extract_file(file_name, target_folder):

    print(f'Extracting {file_name} to folder: {target_folder}')
    zip_command = plumbum.local[args.zip_path]
    try:
        zip_command['e', f'{file_name}', '-r', '-aoa', f'-o{target_folder}']()
        return True
    except Exception as e:
        print(e)
        print(f'Failed to extract {file_name}')
        return False

def initial_map_extract(map_info, extract_folder):
    global errored_files, failed_extractions

    file_name = map_info['Files'][0]['Name']
    archive_file = download_folder/file_name

    zip_command = plumbum.local[args.zip_path]

    return extract_file(archive_file, extract_folder)


count = 0
errored_filenames = []


# Perform initial extraction
# Extract all archives to a temp folder with the same name as the archive file
# Then extract any nested archives to the SAME folder. Most nested archives are bz2 files which are just archives of a single file (the bsp)
if args.job == 'init_extract':
    for map_info in (x for x in get_single_file_maps(map_data)):
        extract_folder = get_init_extract_folder(map_info)

        if not extract_folder.exists(): 
            extract_folder.mkdir()

        success = initial_map_extract(map_info, extract_folder)
        if not success:
            failed_extractions += [map_info['Name']]
            map_info['Failed Init Extraction'] = 1
            map_info['Invalid'] = 1
            continue

        # Continue extracting any extracted archives.
        for archive_file in (x for x in extract_folder.iterdir() if x.suffix in ['.rar', '.bz2', '.zip']):
            extract_file(archive_file.resolve(), archive_file.parent)

def increment_dict(dict, key):
    if key in dict: dict[key]+=1
    else: dict[key] = 1


count = 0
if args.job == 'analysis':
    print('analysis')

    total_file_types = {}
    sub_folder_names = {}
    bsp_count_dict = {}

    total_maps_looked_at = 0

    maps_with_root_bsp = 0
    
    for map_info in get_single_file_maps(map_data):
        if 'Failed Init Extract' in map_info:
            continue

        extract_folder = get_init_extract_folder(map_info)

        map_name = map_info['Name']
        map_files = list(extract_folder.iterdir())

        bsp_files = list(extract_folder.glob('**/*.bsp'))
        map_info['BspFiles'] = list(map(lambda x: x.name, bsp_files))

        root_bsp_count = next((x for x in extract_folder.glob('*.bsp')), 0)
        if root_bsp_count:
            maps_with_root_bsp += 1
        
        bsp_count = len(bsp_files)
        if bsp_count > 1 or bsp_count == 0: 
            print(f'Map "{map_name}", with map folder: "{extract_folder}", has {bsp_count} bsp files.')

        increment_dict(bsp_count_dict, bsp_count)

        if bsp_count == 1:
            bsp_file = bsp_files[0]

            print(f'Reading entities for map: {map_name} with map file: {bsp_file}')

            try:
                bsp = bsp_tool.load_bsp(str(bsp_file))
                weapons = set()
                for entity in bsp.ENTITIES:
                    if entity['classname'].startswith('weapon_'):
                        weapons.add(entity['classname'].replace('weapon_', ''))
                    if entity['classname'] == 'trigger_push':
                        map_info['HasPushes'] = 1
                    if entity['classname'] == 'trigger_teleport':
                        map_info['HasTeleport'] = 1
                map_info['Weapons'] = list(weapons)

                write_json_file(args.map_info_file, map_data)
            except Exception as e:
                print(f'Could not use bsp_tool to analyse map {map_name} with file name {bsp_file}')
                map_info['Bsp Tool Failed'] = 1

        # multifile_archive_files = list((x for x in extract_folder.iterdir() if x.suffix in ['.rar', '.zip']))
        # for archive in multifile_archive_files:
        #     success, info = get_archive_info(archive)
        #     if not success:
        #         print(f'Could not read archive: {archive}')
        #         continue
        #     sub_archives = [x for x in info if x['Path'].endswith('.7z') or x['Path'].endswith('.zip') or x['Path'].endswith('.rar')]
        #     if len(sub_archives) > 0:
        #         print(f'Map "{map_name}", with map folder: "{extract_folder}", has nested archives...')               

        if True: # Commented out crap
            None
            # archive_files = list((x for x in extract_folder.iterdir() if x.suffix in ['.rar', '.zip']))

            # print(f'Looking at archive for map folder: {extract_folder.name}')
            # for archive_file in archive_files:
            #     # print(dir(archive_file))
            #     print(f'Getting archive info for file: {extract_folder/archive_file.name}')
            #     file_info = get_archive_info(extract_folder/archive_file.name)
            #     print(file_info)
            #     # exit()

            # if len(archive_files) > 1:
            #     print(f'Map folder {extract_folder.name} has more than 1 archive file')
            # print(len(archive_files))
            # print

            # if folder_has_archive(extract_folder) and folder_has_subfolders(extract_folder):
            #     print(f'Folder: {extract_folder.name} has archive and subfolders.')

            # if extract_folder.name == 'nightmare_church_rc2.rar':
            #     print('Nightmare church files:')
            #     for file in map_files:
            #         print(f'File: {file.name} Suffix: {file.suffix}')
            #     print(map_files)
            #     exit()

            # if not folder_has_archive(extract_folder) and 


            # if next((x for x in map_files if x.suffix == '.ace'), None):
            #     print(f'Map {map_name} has an ace file')
            #     exit()
            # if not next((x for x in map_files if x.suffix == '.bsp'), None):
            #     maps_with_no_bsp += 1
            # if (extra_bsps := len(list(x for x in map_files if x.suffix == '.bsp'))) > 1:
            #     maps_with_more_than_one_bsp += 1
            #     total_extra_bsps += extra_bsps
            #     # print(f'No bsp file found in map {map_name}')
            #     # print(extract_folder)

        for file in map_files:
            if file.is_dir():
                increment_dict(sub_folder_names, file.name)
                continue

            if file.suffix == '':
                print(f'Empty suffix file: {file.name}')

            increment_dict(total_file_types, file.suffix)

        total_maps_looked_at +=1

        count+=1

    print(bsp_count_dict)
    print('Failed extractions: ')
    print(json.dumps(failed_extractions, indent=4))

    print('Writing updated metadata file')
    write_json_file(args.map_info_file, map_data)
    exit()

for map_info in (x for x in map_data['MapInfo'] if len(x['Files']) == 1):
    map_name = map_info['Name']
    archive_filename = download_folder/map_info['Files'][0]['Name']

    success, file_info = get_archive_info(archive_filename)

    if not success:
        print(f'Could not get archive file info for map: {map_name}')
    else:
        # print(f'Retrieved {len(file_info)} files for map {map_name}')
        # print(json.dumps(file_info,indent = 4))
        None
    if len(file_info) > 2:
        print(file_info[0]['Path'])

    count+=1
    # print(f'Inspected {count} files')

print('Errored files: ', errored_files)