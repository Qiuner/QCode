extends SceneTree
## Check the bundled font itself; desktop system fallback can hide Web defects.

func _initialize() -> void:
	var font := load("res://assets/fonts/MosslightUI.ttf") as FontFile
	font.allow_system_fallback = false
	var missing := ""
	for filename in DirAccess.get_files_at("res://scripts"):
		if not filename.ends_with(".gd"):
			continue
		var text := FileAccess.get_file_as_string("res://scripts/" + filename)
		for character in text:
			if character.unicode_at(0) < 32 or character == "\uFEFF":
				continue
			if not font.has_char(character.unicode_at(0)) and not missing.contains(character):
				missing += character
	if not missing.is_empty():
		push_error("UI font is missing characters: " + missing + ". Run tools/subset_font.py before exporting.")
		quit(1)
	else:
		print("MOSSLIGHT_UI_FONT_OK: all script characters covered without system fallback")
		quit(0)
