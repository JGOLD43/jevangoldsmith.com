#!/usr/bin/env python3
"""Import link metadata from a saved copy of The Unintuitive's archive.

Usage: python3 scripts/import-learning-archive.py /path/to/source.html
Only the article's material lists are read, never navigation, comments, or prose.
Existing records retain IDs derived from their source URL. No linked works are copied.
"""
import hashlib
import json
import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

SOURCE = 'https://theunintuitive.com/p/antidote-to-slop-an-archive-of-life'


class ArchiveParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.heading = None
        self.heading_text = ''
        self.section = None
        self.topic = None
        self.item = None
        self.link = None
        self.items = []
        self.updated = None

    def handle_starttag(self, tag, attrs):
        if tag in ('h2', 'h3', 'h4'):
            self.heading, self.heading_text = tag, ''
        if tag == 'li' and self.section and self.topic:
            self.item = {'text': '', 'links': []}
        if tag == 'a' and self.item is not None:
            self.link = {'url': dict(attrs).get('href', ''), 'title': ''}

    def handle_data(self, text):
        if self.heading:
            self.heading_text += text
        if self.item is not None:
            self.item['text'] += text
        if self.link is not None:
            self.link['title'] += text

    def handle_endtag(self, tag):
        if tag == self.heading:
            text = self.heading_text.strip()
            if text.startswith('Last updated - '):
                self.updated = text.removeprefix('Last updated - ')
            if tag == 'h2':
                self.section = text if text in ('Written content', 'Video content', 'Documentaries') else None
                self.topic = None
            elif self.section:
                if text in ('Life', 'Art', 'Business / Career', 'Biz / career', 'Biz / Career', 'Memos', 'Misc', 'Interviews', 'Adventure & Sports'):
                    self.topic = text
                else:
                    self.section = None
                    self.topic = None
            self.heading = None
        if tag == 'a' and self.link is not None:
            self.item['links'].append(self.link)
            self.link = None
        if tag == 'li' and self.item is not None:
            for link in self.item['links']:
                if urlsplit(link['url']).scheme not in ('https', 'http'):
                    raise ValueError('Material link must use HTTP(S)')
                title = ' '.join(link['title'].split())
                if not title:
                    continue
                duration = re.search(r'\(([^()]*\b(?:min|hr)[^()]*)\)\s*$', self.item['text'])
                kind = ('documentary' if self.section == 'Documentaries' else
                        'interview' if self.topic == 'Interviews' or 'interview' in title.lower() else
                        'video' if self.section == 'Video content' else
                        'memo' if self.topic == 'Memos' else
                        'art' if self.topic == 'Art' or 'artbook' in title.lower() else
                        'other' if self.topic == 'Misc' else 'article')
                self.items.append({
                    'id': 'archive-' + hashlib.sha256(link['url'].encode()).hexdigest()[:12],
                    'title': title, 'url': link['url'], 'kind': kind,
                    'topic': 'Business / Career' if self.topic.lower() == 'biz / career' else self.topic,
                    'medium': 'Written' if self.section == 'Written content' else 'Video',
                    'duration': duration.group(1).strip() if duration else None,
                    'sourceSection': self.section,
                })
            self.item = None


def main():
    parser = ArchiveParser()
    parser.feed(Path(sys.argv[1]).read_text())
    if len(parser.items) < 200 or not parser.updated:
        raise ValueError('Archive structure changed or source is incomplete; review before importing')
    if len({item['url'] for item in parser.items}) != len(parser.items):
        raise ValueError('Duplicate material URLs; review the source before importing')
    result = {
        'source': {'title': 'Antidote to Slop: An Archive of Life-Changing Material',
                   'curator': 'The Unintuitive', 'url': SOURCE,
                   'updated': parser.updated, 'imported': date.today().isoformat()},
        'items': parser.items,
    }
    destination = Path(__file__).resolve().parents[1] / 'data/learning-archive.json'
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(parser.items)} links to {destination}')
    from collections import Counter
    print(dict(Counter(item['kind'] for item in parser.items)))


if __name__ == '__main__':
    main()
