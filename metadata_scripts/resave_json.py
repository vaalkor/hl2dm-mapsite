import json
import argparse
from hl2_utils import open_json_file, write_json_file

parser = argparse.ArgumentParser(description='This script simply resaves a json file with an indentation of 2.')
parser.add_argument('--file', dest='file', required=True, help='Map metadata file path')
args = parser.parse_args()

file_data = open_json_file(args.file)

write_json_file(args.file, file_data)
