shader_type spatial;
varying float dune_height;

void vertex() {
	dune_height = (MODEL_MATRIX * vec4(VERTEX, 1.0)).y;
}

void fragment() {
	// A continuous gradient reveals dune relief without polygon-shaped color bands.
	vec3 valley = vec3(0.570, 0.467, 0.369);
	vec3 crest = vec3(0.637, 0.537, 0.428);
	ALBEDO = mix(valley, crest, smoothstep(0.05, 1.8, dune_height));
	ROUGHNESS = 0.95;
}
