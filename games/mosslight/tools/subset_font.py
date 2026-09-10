"""Generate a compact, renamed Noto Sans SC derivative for all game's UI text.

Requires fonttools. Source: build/font-source/NotoSansSC.ttf (Google Fonts, OFL).
Run again after adding Chinese UI copy. Includes ASCII and the game's source text.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[1]
source = root / 'build/font-source/NotoSansSC.ttf'
font = TTFont(source)
instantiateVariableFont(font, {'wght': 450}, inplace=True)
text = ''.join(chr(c) for c in range(32, 127))
for script in (root / 'scripts').glob('*.gd'):
    text += script.read_text(encoding='utf-8')
options = subset.Options()
options.name_IDs = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
for record in font['name'].names:
    if record.nameID in (1, 2, 3, 4, 6, 16, 17):
        label = 'Regular' if record.nameID in (2, 17) else 'MosslightUI' if record.nameID == 6 else 'Mosslight UI'
        record.string = label.encode(record.getEncoding())
output = root / 'assets/fonts/MosslightUI.ttf'
font.save(output)
print('MOSSLIGHT_FONT_OK', output.stat().st_size, 'bytes;', len(set(text)), 'characters requested')
