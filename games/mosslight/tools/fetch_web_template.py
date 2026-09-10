"""Fetch only the Web templates from the official Godot archive using HTTP ranges.

Python standard library only. ZIP CRCs are verified by zipfile. Existing template
files are preserved. Run with --list to inspect the archive without installing.
"""
import argparse
import io
import os
from pathlib import Path
import urllib.request
import zipfile


class RemoteArchive(io.RawIOBase):
    def __init__(self, url):
        with urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), timeout=30) as response:
            self.url = response.url
            self.length = int(response.headers['Content-Length'])
        self.position = 0

    def seekable(self):
        return True

    def seek(self, offset, whence=0):
        self.position = offset + (self.position if whence == 1 else self.length if whence == 2 else 0)
        return self.position

    def tell(self):
        return self.position

    def read(self, size=-1):
        size = self.length - self.position if size < 0 else min(size, self.length - self.position)
        if size <= 0:
            return b''
        first = self.position
        request = urllib.request.Request(self.url, headers={'Range': f'bytes={first}-{first + size - 1}'})
        with urllib.request.urlopen(request, timeout=60) as response:
            expected = f'bytes {first}-{first + size - 1}/{self.length}'
            if response.status != 206 or response.headers.get('Content-Range') != expected:
                raise RuntimeError('Server did not honor the requested archive byte range.')
            data = response.read(size)
        if len(data) != size:
            raise IOError('Incomplete archive download; rerun to retry.')
        self.position += size
        return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', default='4.7.2')
    parser.add_argument('--list', action='store_true')
    args = parser.parse_args()
    url = (f'https://github.com/godotengine/godot/releases/download/{args.version}-stable/'
           f'Godot_v{args.version}-stable_export_templates.tpz')
    destination = Path(os.environ['APPDATA']) / 'Godot' / 'export_templates' / f'{args.version}.stable'
    with zipfile.ZipFile(RemoteArchive(url)) as archive:
        entries = [entry for entry in archive.infolist() if Path(entry.filename).name.startswith('web')]
        for entry in entries:
            name = Path(entry.filename).name
            print(name, entry.file_size, flush=True)
            if not args.list and name in {'web_nothreads_release.zip', 'web_nothreads_debug.zip'}:
                destination.mkdir(parents=True, exist_ok=True)
                output = destination / name
                if not output.exists():
                    payload = archive.read(entry)
                    temporary = output.with_suffix('.download')
                    temporary.write_bytes(payload)
                    temporary.replace(output)
                    print('Installed', output, flush=True)
