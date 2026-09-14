shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never;

uniform float wind_time = 0.0;
uniform float phase = 0.0;
uniform float strength = 0.0;

void fragment() {
	// Soft, broken streaks stay low on the dune. No screen distortion or TIME clock.
	vec2 p = UV;
	float edge = smoothstep(0.0, 0.16, p.x) * (1.0 - smoothstep(0.78, 1.0, p.x));
	edge *= smoothstep(0.0, 0.23, p.y) * (1.0 - smoothstep(0.70, 1.0, p.y));
	float flow = p.x * 16.0 - wind_time * 1.7 + phase;
	float ribbon = sin(p.y * 37.0 + sin(flow * 0.38) * 1.8);
	float streaks = pow(max(0.0, ribbon), 5.0);
	float broken = smoothstep(-0.35, 0.8, sin(flow) + sin(flow * 1.73 + p.y * 9.0) * 0.5);
	ALBEDO = vec3(0.92, 0.77, 0.53);
	ALPHA = edge * streaks * broken * strength * 0.24;
}
