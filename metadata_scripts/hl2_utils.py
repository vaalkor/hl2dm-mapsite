import json
from pathlib import Path

def open_json_file(filename):
    with open(filename, 'r') as read_file:
        return json.load(read_file)

def write_json_file(filename, data, indent=None):
    with open(filename, 'w') as write_file:
        json.dump(data, write_file, indent=indent)

def get_directory_throw_no_exists(path):
    new_path = Path(path)
    if not new_path.is_dir():
        raise Exception(f'Path {path} is not a directory!')
    if not new_path.exists:
        raise Exception(f'Path {path} does not exist!')
    return new_path

def get_file_throw_no_exists(path):
    new_path = Path(path)
    if not new_path.is_file():
        raise Exception(f'Path {path} is not a file!')
    if not new_path.exists:
        raise Exception(f'Path {path} does not exist!')
    return new_path
