"""An original, quiet 24-second pentatonic music loop; Python standard library only."""
from pathlib import Path
import math
import random
import struct
import wave

rate = 22050
duration = 24
notes = [62, 69, 74, 78, 76, 69, 66, 74, 69, 62, 66, 69]
rng = random.Random(29)
samples = []
air = 0.0
for i in range(rate * duration):
    t = i / rate
    signal = 0.0
    for n, note in enumerate(notes):
        age = t - n * 1.8 - .5
        if 0 <= age <= 4.5:
            f = 440 * 2 ** ((note - 69) / 12)
            env = min(age / .02, 1) * math.exp(-age * 1.25)
            signal += env * (.18 * math.sin(math.tau * f * age)
                             + .055 * math.sin(math.tau * f * 2 * age)
                             + .015 * math.sin(math.tau * f * 3 * age))
    air = air * .985 + rng.uniform(-1, 1) * .015
    signal += air * .09
    fade = min(t / 1.5, (duration - t) / 2.5, 1)
    samples.append(struct.pack('<h', int(max(-1, min(1, signal * fade)) * 32767)))
target = Path(__file__).resolve().parents[1] / 'assets' / 'island_ambience.wav'
with wave.open(str(target), 'wb') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(rate)
    f.writeframes(b''.join(samples))
print('MOSSLIGHT_AUDIO_OK', target)
