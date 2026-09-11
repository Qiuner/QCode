shader_type spatial;
render_mode unshaded, fog_disabled, depth_draw_never, depth_test_disabled, cull_disabled;

uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_linear;
uniform sampler2D depth_texture : hint_depth_texture, repeat_disable, filter_nearest;
uniform vec3 focus_position;
uniform float clear_radius = 10.0;
uniform float haze_radius = 32.0;
uniform vec3 haze_color : source_color = vec3(0.55, 0.72, 0.70);

void vertex() {
	POSITION = vec4(VERTEX.xy, 1.0, 1.0);
}

void fragment() {
	float depth = texture(depth_texture, SCREEN_UV).r;
	vec3 ndc = vec3(SCREEN_UV, depth) * 2.0 - 1.0;
	vec4 view = INV_PROJECTION_MATRIX * vec4(ndc, 1.0);
	view /= view.w;
	vec3 world = (INV_VIEW_MATRIX * view).xyz;
	float distance_to_focus = length(world.xz - focus_position.xz);
	float haze = smoothstep(clear_radius, haze_radius, distance_to_focus);
	vec3 color = texture(screen_texture, SCREEN_UV).rgb;
	if (haze > 0.01) {
		vec2 offset = vec2(2.4 * haze) / VIEWPORT_SIZE;
		vec3 soft = color * 0.28;
		soft += texture(screen_texture, SCREEN_UV + vec2(offset.x, offset.y)).rgb * 0.18;
		soft += texture(screen_texture, SCREEN_UV + vec2(-offset.x, offset.y)).rgb * 0.18;
		soft += texture(screen_texture, SCREEN_UV + vec2(offset.x, -offset.y)).rgb * 0.18;
		soft += texture(screen_texture, SCREEN_UV - offset).rgb * 0.18;
		color = mix(color, soft, haze);
	}
	ALBEDO = mix(color, haze_color, haze * 0.38);
}
