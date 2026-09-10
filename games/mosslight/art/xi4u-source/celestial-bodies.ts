import * as T from 'three';

export type CelestialState = {
  /** Unit direction from the garden toward the body, matching light.position - light.target. */
  sunDirection: readonly [number, number, number];
  moonDirection: readonly [number, number, number];
  daylight: number;
  nightMix: number;
  /** 0 = clear, 1 = overcast; intermediate values can be interpolated by the clock. */
  cloudy: number;
};

export type CelestialViewport = {
  /** CSS pixels, independent of the renderer's DPR and pixel-art sampling. */
  width: number;
  height: number;
  /** Optional UI/composition margins, also CSS pixels. Bodies remain inside this sky area. */
  safeArea?: { top?: number; right?: number; bottom?: number; left?: number };
};

/** Two small camera-facing geometries, behind the garden rather than over its silhouette.
 * Attach to scene directly: root's collectGardenFramePoints must never include this group.
 * No second render, texture, light, timer, global random number, or custom shader is needed.
 */
export function createCelestialBodies(scene: T.Scene, camera: T.Camera) {
  const group = new T.Group();
  group.name = 'distant-celestial-bodies';
  group.userData.inkOutline = false;
  group.userData.excludeFromFraming = true;
  scene.add(group);

  // A cream core and a tiny fading rim share one geometry / one draw call.
  // Vertex alpha makes the rim genuinely transparent, without a dark/background disk.
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const segments = 48;
  const core = new T.Color('#fff1b4'), edge = new T.Color('#f7c984');
  positions.push(0, 0, 0); colors.push(core.r, core.g, core.b, 1);
  for (const [radius, alpha] of [[1, 1], [1.06, .24], [1.27, 0]]) {
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      colors.push(edge.r, edge.g, edge.b, alpha);
    }
  }
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    indices.push(0, 1 + i, 1 + j);
    for (let ring = 0; ring < 2; ring++) {
      const a = 1 + ring * segments + i, b = 1 + ring * segments + j;
      const c = a + segments, d = b + segments;
      indices.push(a, c, b, b, c, d);
    }
  }
  const sunGeometry = new T.BufferGeometry();
  sunGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  sunGeometry.setAttribute('color', new T.Float32BufferAttribute(colors, 4));
  sunGeometry.setIndex(indices);
  sunGeometry.computeVertexNormals();
  sunGeometry.computeBoundingSphere();
  const sunMaterial = new T.MeshBasicMaterial({
    color: '#ffffff', vertexColors: true, transparent: true, opacity: 0,
    depthTest: true, depthWrite: false, toneMapped: false,
  });
  const sun = new T.Mesh(sunGeometry, sunMaterial);
  sun.name = 'small-distant-sun';

  // Crescent as the region between two intersecting circles. The cut-out is
  // empty geometry, so all backgrounds and alpha remain correct at both tips.
  const moonShape = new T.Shape(), offset = .42, innerRadius = .92;
  const crossX = (1 - innerRadius * innerRadius + offset * offset) / (2 * offset);
  const outerAngle = Math.acos(crossX);
  const innerAngle = Math.acos((crossX - offset) / innerRadius);
  moonShape.absarc(0, 0, 1, outerAngle, Math.PI * 2 - outerAngle, false);
  moonShape.absarc(offset, 0, innerRadius, -innerAngle, innerAngle, true);
  moonShape.closePath();
  const moonGeometry = new T.ShapeGeometry(moonShape, 28);
  // Both arcs share their tip mathematically; discard float-rounded zero-area
  // tip triangles before upload so no invalid normal/edge reaches postprocessing.
  const moonPositions = moonGeometry.getAttribute('position'), moonIndex = moonGeometry.getIndex()!;
  const moonTriangles: number[] = [];
  for (let i = 0; i < moonIndex.count; i += 3) {
    const a = moonIndex.getX(i), b = moonIndex.getX(i + 1), c = moonIndex.getX(i + 2);
    const ax = moonPositions.getX(a), ay = moonPositions.getY(a);
    const area = (moonPositions.getX(b) - ax) * (moonPositions.getY(c) - ay)
      - (moonPositions.getY(b) - ay) * (moonPositions.getX(c) - ax);
    if (area > 1e-10) moonTriangles.push(a, b, c);
  }
  moonGeometry.setIndex(moonTriangles);
  moonGeometry.rotateZ(-.18);
  const moonMaterial = new T.MeshBasicMaterial({
    color: '#e8eef7', transparent: true, opacity: 0,
    depthTest: true, depthWrite: false, toneMapped: false,
  });
  const moon = new T.Mesh(moonGeometry, moonMaterial);
  moon.name = 'small-distant-crescent';

  for (const body of [sun, moon]) {
    body.userData.inkOutline = false;
    body.userData.excludeFromFraming = true;
    body.castShadow = false;
    body.receiveShadow = false;
    // Opaque garden geometry has already written depth. Draw these early among
    // transparent objects so foliage/water/atmosphere can still composite over them.
    body.renderOrder = -20;
    body.visible = false;
    body.userData.sky = { x: 0, y: 0, radius: 0, altitude: 0, horizontal: 0, depth: 0 };
    group.add(body);
  }

  const direction = new T.Vector3(), right = new T.Vector3();
  const cameraPosition = new T.Vector3(), cameraRotation = new T.Quaternion();
  const point = new T.Vector3();
  let disposed = false;
  let lastViewport: CelestialViewport = { width: 390, height: 844 };
  const clamp01 = (value: number) => T.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);

  function place(body: T.Mesh, vector: readonly [number, number, number], opacity: number, radius: number, depth: number) {
    direction.set(vector?.[0] ?? 0, vector?.[1] ?? -1, vector?.[2] ?? 0);
    if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() < 1e-9) {
      body.visible = false;
      return;
    }
    direction.normalize();
    const altitude = direction.y;
    const horizonFade = T.MathUtils.smoothstep(altitude, -.045, .075);
    const material = body.material as T.MeshBasicMaterial;
    material.opacity = opacity * horizonFade;
    body.visible = material.opacity > .005;
    if (!body.visible) return;

    const w = Math.max(1, lastViewport.width), h = Math.max(1, lastViewport.height);
    const margin = radius * 1.27 + 10;
    const safe = lastViewport.safeArea ?? {};
    const defaultTop = h < 540 ? 58 : w <= 680 ? 98 : 90;
    const left = Math.min(w * .4, Math.max(0, safe.left ?? 12)) + margin;
    const rightEdge = Math.max(w * .6, w - Math.max(0, safe.right ?? 12)) - margin;
    const top = Math.min(h * .36, Math.max(0, safe.top ?? defaultTop)) + margin;
    const bottomLimit = h - Math.max(0, safe.bottom ?? 0) - margin;
    const bottom = Math.max(top, Math.min(bottomLimit, top + Math.max(22, Math.min(86, h * .105))));

    // Flatten camera-right onto the ground plane, so altitude cannot reverse
    // east/west. Horizontal projection smoothly shrinks as a body rises overhead.
    const horizontal = T.MathUtils.clamp(direction.dot(right), -1, 1);
    const skyRise = Math.pow(Math.max(0, altitude), .62);
    const x = (left + rightEdge) * .5 + horizontal * (rightEdge - left) * .48;
    const y = T.MathUtils.lerp(bottom, top, skyRise);
    const ndcX = x / w * 2 - 1, ndcY = 1 - y / h * 2;
    const projection = camera as T.OrthographicCamera & T.PerspectiveCamera;
    let pixelWorld: number;
    if (projection.isOrthographicCamera) {
      const zoom = Math.max(.001, projection.zoom);
      const halfWidth = (projection.right - projection.left) / (2 * zoom);
      const halfHeight = (projection.top - projection.bottom) / (2 * zoom);
      point.set((projection.left + projection.right) * .5 + ndcX * halfWidth,
        (projection.top + projection.bottom) * .5 + ndcY * halfHeight, -depth);
      pixelWorld = halfHeight * 2 / h;
    } else if (projection.isPerspectiveCamera) {
      const halfHeight = depth * Math.tan(T.MathUtils.degToRad(projection.fov) * .5) / Math.max(.001, projection.zoom);
      point.set(ndcX * halfHeight * projection.aspect, ndcY * halfHeight, -depth);
      pixelWorld = halfHeight * 2 / h;
    } else {
      body.visible = false;
      return;
    }
    body.position.copy(point.applyQuaternion(cameraRotation).add(cameraPosition));
    body.quaternion.copy(cameraRotation);
    body.scale.setScalar(radius * pixelWorld);
    const sky = body.userData.sky;
    sky.x = x; sky.y = y; sky.radius = radius;
    sky.altitude = altitude; sky.horizontal = horizontal; sky.depth = depth;
  }

  return {
    update(state: CelestialState, viewport?: CelestialViewport) {
      if (disposed) return;
      if (viewport && Number.isFinite(viewport.width + viewport.height) && viewport.width > 0 && viewport.height > 0) lastViewport = viewport;
      camera.updateWorldMatrix(true, false);
      camera.getWorldPosition(cameraPosition);
      camera.getWorldQuaternion(cameraRotation);
      right.set(1, 0, 0).applyQuaternion(cameraRotation);
      right.y = 0;
      if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
      else right.normalize();

      const projection = camera as T.PerspectiveCamera;
      const near = Number.isFinite(projection.near) ? projection.near : .1;
      const far = Number.isFinite(projection.far) ? projection.far : 100;
      // Default garden camera is 24 world units from its target, far=100.
      // Keeping bodies at 85% of the available depth makes garden occlusion work.
      const depth = near + Math.max(.01, far - near) * .85;
      const daylight = clamp01(state.daylight), night = clamp01(state.nightMix), clouds = clamp01(state.cloudy);
      const weatherVisibility = T.MathUtils.lerp(1, .18, clouds);
      const lowSun=1-T.MathUtils.smoothstep(state.sunDirection[1],0,.45);
      sunMaterial.color.set('#ffffff').lerp(new T.Color('#ff9365'),lowSun*.65);
      const size = T.MathUtils.clamp(Math.min(lastViewport.width, lastViewport.height) * .029, 10, 15);
      place(sun, state.sunDirection, (1 - night) * (.45 + .55 * daylight) * weatherVisibility, size * (1 + lowSun * .15), depth);
      place(moon, state.moonDirection, night * .91 * weatherVisibility, size * .94, depth - .01);
      group.visible = sun.visible || moon.visible;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      sunGeometry.dispose(); moonGeometry.dispose();
      sunMaterial.dispose(); moonMaterial.dispose();
      group.clear();
    },
  };
}
