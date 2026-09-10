shader_type spatial;
render_mode cull_disabled;

void fragment() {
	// Three exports linear COLOR_0. Compatibility lighting expects sRGB albedo.
	vec3 linear_color = COLOR.rgb;
	ALBEDO = mix(12.92 * linear_color, 1.055 * pow(linear_color, vec3(1.0 / 2.4)) - 0.055,
		step(vec3(0.0031308), linear_color));
	ROUGHNESS = 0.88;
}
