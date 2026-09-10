"""Save the converted MIT xi4u courtyard as an editable Blender source and GLB.

Run convert_streamside.mjs first. Other islands and the xi4u project are untouched.
"""
from pathlib import Path
import shutil
import bpy

root = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root / 'build/streamside-converted.glb'))
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'art/streamside.blend'))
# Avoid Blender's material-based vertex-color export filter dropping COLOR_0.
shutil.copyfile(root / 'build/streamside-converted.glb', root / 'assets/streamside.glb')
print('STREAMSIDE_BLENDER_COMPLETE')
