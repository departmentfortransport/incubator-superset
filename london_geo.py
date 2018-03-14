import ast
# from html.parser import HTMLParser
import string
import json
import pandas as pd
import seaborn as sns

uk_data['features'][0]['properties']['TYPE_2']

import os
print(os.getcwd())

filename = 'bad_uk.geojson'
with open(filename, 'r') as f:
    uk_data = json.load(f)

type_names=[]
for iso in uk_data['features']:
    type_names.append(iso['properties']['TYPE_2'])

type_names

london = []
for k, name in enumerate(type_names):
    if name == 'London Borough' \
    or name == "London Borough (city)" \
    or name == "London Borough (royal)":
        london.append(uk_data['features'][k])

london_boroughs = {"type": "FeatureCollection"}
london_boroughs['features'] = london

len(london_boroughs['features'])

london_boroughs

with open('london_boroughs.geojson', 'w') as f:
    f.write(json.dumps(london_boroughs))

# ll=[]
# for iso in london_boroughs['features']:
#     ll.append(iso['properties']['NAME_2'])
#
# ll


# uk_data['features'][0]['properties']['TYPE_2']
