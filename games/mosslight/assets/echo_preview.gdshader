shader_type spatial;
render_mode unshaded, shadows_disabled, depth_draw_never;

uniform vec4 tint : source_color = vec4(0.55, 0.95, 0.82, 0.30);

void fragment() {
	ALBEDO = tint.rgb;
	ALPHA = tint.a;
}
