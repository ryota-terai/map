#!/usr/bin/env python3
"""Cloudflare Pagesのファイルサイズ上限(25MiB)を超えるGeoJSONを分割する。

使い方:
    python3 tools/split_geojson.py data/shelter.json data/gml/datalist/N03/N03-20260101_01.geojson ...

元のファイル(例: foo.geojson)は分割後のファイル一覧を持つインデックスに置き換わる。
    {"type": "SplitFeatureCollection", "parts": ["foo.part1.geojson", "foo.part2.geojson"]}
各パートは元のファイルのトップレベル属性(name, crs等)を引き継いだFeatureCollection。
index.jsのgetGeoJSON()がインデックスを検出してパートを取得・結合する。
"""
import json
import os
import sys

MAX_PART_BYTES = 20 * 1024 * 1024  # 上限25MiBに対して余裕を持たせる


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def write_part(path, header, feature_lines):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(header)
        f.write(',\n'.join(feature_lines))
        f.write('\n]}\n')


def split(path):
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    if data.get('type') == 'SplitFeatureCollection':
        print(f'skip (already split): {path}')
        return

    features = data.pop('features')
    # "features"以外の属性を先頭に書き、featuresは1行1地物で出力する
    header = dumps(data)[:-1] + (',' if data else '') + '"features":[\n'

    directory, filename = os.path.split(path)
    stem, ext = os.path.splitext(filename)
    parts = []
    lines, size = [], len(header.encode('utf-8'))
    for feature in features:
        line = dumps(feature)
        line_size = len(line.encode('utf-8')) + 2
        if lines and size + line_size > MAX_PART_BYTES:
            parts.append(lines)
            lines, size = [], len(header.encode('utf-8'))
        lines.append(line)
        size += line_size
    parts.append(lines)

    names = []
    for i, part in enumerate(parts, start=1):
        name = f'{stem}.part{i}{ext}'
        write_part(os.path.join(directory, name), header, part)
        names.append(name)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(dumps({'type': 'SplitFeatureCollection', 'parts': names}) + '\n')
    print(f'{path}: {len(features)} features -> {len(names)} parts')


if __name__ == '__main__':
    for p in sys.argv[1:]:
        split(p)
