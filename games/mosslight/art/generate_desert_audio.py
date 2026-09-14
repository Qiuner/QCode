"""An original, soft bronze wind-chime phrase; Python standard library only.

Writes only assets/desert_chime.wav. No recordings or third-party samples.
"""
import math
import struct
import wave
from pathlib import Path

rate = 22050
duration = 4.0
strikes = [(0.04, 880.0, .23), (.31, 1174.66, .16), (.78, 1318.51, .12)]
data = bytearray()
for i in range(int(rate * duration)):
    t = i / rate
    sample = 0.0
    for onset, frequency, strength in strikes:
        age = t - onset
        if age < 0:
            continue
        attack = min(1.0, age / .012)
        for ratio, level, decay in [(1, 1, 1.65), (2.71, .24, 3.2), (4.07, .08, 5.0)]:
            sample += strength * level * attack * math.exp(-age * decay) * math.sin(math.tau * frequency * ratio * age)
    sample *= min(1.0, (duration - t) / .3)
    data.extend(struct.pack('<h', round(max(-1, min(1, sample)) * 32767)))
target = Path(__file__).resolve().parents[1] / 'assets/desert_chime.wav'
with wave.open(str(target), 'wb') as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(rate)
    audio.writeframes(data)
print('MOSSLIGHT_DESERT_CHIME_OK', len(data), 'PCM bytes')
