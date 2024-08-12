import requests
import argparse
from pathlib import Path
import time
from hl2_utils import open_json_file, write_json_file, get_directory_throw_no_exists, get_file_throw_no_exists
import plumbum

FILE_DOWNLOAD_DELAY = 30
LAST_DOWNLOAD_TIMESTAMP = 1604148840

parser = argparse.ArgumentParser(description='This script augments the map metadata with the category. So we can just look at deathmatch maps.')
parser.add_argument('--map-info-file', dest='map_info_file', required=True, help='Map metadata file')
parser.add_argument('--existing-download-path', dest='existing_download_path', required=True, help='Location of existing downloaded files. Could be same as destination.')
parser.add_argument('--download-path', dest='download_path', required=True, help='Map download destination')
parser.add_argument('-7zp', '--7z-path', dest='zip_path', default='C:\\Program Files\\7-Zip\\7z.exe', required=False, help='7zip executable path')
args = parser.parse_args()

get_file_throw_no_exists(args.zip_path)

def is_valid_archive(filename):
    zip_command = plumbum.local[args.zip_path]
    try: zip_command['l', '-slt', '-ba', filename](); return True
    except: return False

existing_download_folder = get_directory_throw_no_exists(args.existing_download_path)
download_path = get_directory_throw_no_exists(args.download_path)

print(len([x for x in download_path.iterdir()]))

existing_file_names = set()
existing_file_names.update((x.name for x in existing_download_folder.iterdir()))
existing_file_names.update((x.name for x in download_path.iterdir()))
print(f'Existing file count: {len(existing_file_names)}')

count = 0
file_data = open_json_file(args.map_info_file)

download_folder = Path('downloads')
if(not download_folder.exists()): download_folder.mkdir()

maps_with_single_file = [x for x in file_data['MapInfo'] if len(x['Files']) == 1]
print(f'# Maps with single file: {len(maps_with_single_file)}')

maps_with_undownloaded_file = [map for map in maps_with_single_file if not map['Files'][0]['Name'] in existing_file_names]
print(f'# Maps with undownloaded file: {len(maps_with_undownloaded_file)}')

for map_info in maps_with_undownloaded_file:
    # if 'd' in map_info:
    #     continue

    file_info = map_info['Files'][0]
    map_name = file_info['Name']

    while True:
        print('Downloading file: ' + file_info['Name'] + ' with URL: ' + file_info['Url'])
        try:
            response = requests.get(file_info['Url'])
            print(f'Content type for map {map_name}: ' + response.headers.get('Content-Type', ''))
            
            print(f'Response content size for map {map_name} is {len(response.content)} bytes')

            if len(response.content) < 10 * 1024:
                print(f'Response content for map {map_name} is less than 10kb !')

            if '504 Gateway Time-out' in response.text:
                print(f'Gateway timeout for map {map_name}... Trying again')
                continue

            with open(download_folder/file_info['Name'], 'wb') as file:
                file.write(response.content)
            
            if is_valid_archive(download_folder/file_info['Name']):
                print(f'Map name {map_name} is a valid archive!')
                break
            else:
                print(f'Map name {map_name} is not a valid archive! Deleting file...')
                (download_folder/file_info['Name']).unlink()

            map_info['d'] = 1
            write_json_file(args.map_info_file, file_data)
            break
        except Exception as e:
            print('Exception: '+ e.message)
            print(f"Downloading map \"{map_info['Name']}\" failed... We will wait 15 seconds and try again")
            time.sleep(15)

    print(f"Map \"{map_info['Name']}\" downloaded successfully... Wait 15 seconds")
    time.sleep(15)
