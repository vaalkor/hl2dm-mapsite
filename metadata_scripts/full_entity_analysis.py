from hl2_utils import open_json_file, write_json_file, get_directory_throw_no_exists, get_file_throw_no_exists
from pathlib import Path
from os import linesep
import json

entity_data = open_json_file('full_entity_data.json')

def first_or_none(iterable):
    return next(iterable, None)

def increment_dict(dict, key):
    if key in dict: dict[key]+=1
    else: dict[key] = 1

print(len(list(entity_data.keys())))

# move_linear_count = len(list(filter(lambda x: 'func_movelinear' in entity_data[x], entity_data.keys())))

def with_entites(*entities):
    global entity_data
    def contains_entities(map_name):
        for entity in entities:
            if not entity in entity_data[map_name]:
                return False
        return True
    return list(filter(contains_entities, entity_data.keys()))


print(json.dumps(with_entites('logic_playerproxy'), indent=2))
