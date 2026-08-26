---
name: complex-geometry
description: Use when creating any Three.js geometry in this project. Decompose the object into sub-components (structural primitives vs organic/curved parts) and build a hybrid model: primitives + CatmullRomCurve3, TubeGeometry, ExtrudeGeometry, LatheGeometry or vertex-buffer deformation. Strict rules for hole capping and spatial orientation/pivot alignment. Trigger keywords: three.js geometry, banana, leaf, rope, bottle, curved, organic, TubeGeometry, LatheGeometry, ExtrudeGeometry, vertex manipulation, syringe, needle, cap, flange.
---

# SYSTEM INSTRUCTION: ADVANCED 3D GEOMETRY ARCHITECT (THREE.JS)

1. COMPONENT DECOMPOSITION & HYBRID MODELING (CRITICAL FIRST STEP)
Before writing any Three.js geometry code, analyze the topology of the requested object. DO NOT force the entire object into a single rigid category. Real-world objects are composites.
ACTION: Break the object down into logical sub-components. For EACH sub-component, choose the most efficient tool:
- Sub-component A (Structural / Blocky / Symmetrical): Use standard primitives (`THREE.BoxGeometry`, `THREE.CylinderGeometry`, etc.).
- Sub-component B (Organic / Curved / Connecting / Custom Profiles): Use Advanced Generation Tools (Sections 2 and 3).
Combine these sub-components into a `THREE.Group`. Always use a hybrid approach if it yields a better, more optimized result.

2. ADVANCED TOOLKIT FOR COMPLEX & CURVED GEOMETRY
When Sub-component B is identified, choose the correct mathematical approach:
- THREE.CatmullRomCurve3: Plot a 3D spline path using `THREE.Vector3` points. Acts as the guiding "spine".
- THREE.TubeGeometry: Extrude a cross-section along a `CatmullRomCurve3`. Perfect for handles, pipes, ropes.
- THREE.ExtrudeGeometry: Draw a complex 2D outline via `THREE.Shape` and extrude it.
- THREE.LatheGeometry: Create symmetrical round shapes by spinning a 2D profile (`THREE.Vector2`) around the Y-axis (bottles, vases).

3. MESH DEFORMATION AND VERTEX MANIPULATION RULES
If you must bend, taper, or deform an existing geometry dynamically:
- Ensure Sufficient Resolution: Set high segment density (e.g., `tubularSegments: 64`).
- Access Buffer Attributes: Use `geometry.attributes.position`.
- Apply Mathematical Transformations: Loop through vertices, calculate progress (0.0 to 1.0), and apply scalar modifiers.
- Update & Recalculate: Always set `geometry.attributes.position.needsUpdate = true` and call `geometry.computeVertexNormals()`.

4. MESH COMPLETENESS & HOLE CAPPING (STRICT RULE)
Models must NEVER have unintended open holes, hollow ends, or "floating" geometry. Every mesh must be visually complete.
- Tube & Path Geometries: Do not leave ends open. Set `openEnded: false`, OR explicitly attach a cap mesh at the exact end coordinates of the curve.
- Extrude & Lathe Geometries: Ensure the 2D profile (`THREE.Shape`) is a fully closed loop.
- Capping with Primitives: Cap complex tube ends using `THREE.CircleGeometry`, a sliced `THREE.SphereGeometry`, or a flattened `THREE.CylinderGeometry`.
- Flanges & Mounting Plates: If a complex tube meets a flat surface, use a "flange" (thin `BoxGeometry` or `CylinderGeometry`) at the intersection to hide seam gaps and cap the hole.

5. SPATIAL ORIENTATION & COMPONENT ALIGNMENT (STRICT RULE)
When assembling multiple meshes, you must correctly manage local space, pivot points, and directional vectors. DO NOT guess Euler angles (e.g., `rotation.x = Math.PI/2`).
- Understand Default Axes: Know how primitives are generated. `CylinderGeometry` and `ConeGeometry` point along the local Y-axis. `TubeGeometry` follows its curve, but its local "up" might vary.
- Pivot Point Management (CRITICAL): The default pivot of a geometry is its center. If you need to rotate a part (like a handle) around a joint, you MUST translate the geometry's vertices first so the pivot is at the joint. 
  *Example:* `handleGeometry.translate(0, -handleLength/2, 0);` moves the pivot to the bottom of the handle. Then, rotating the mesh will swing it correctly from the attachment point.
- Directional Alignment (The "Needle/Handle" Rule): To point a mesh in a specific direction (e.g., a syringe needle pointing OUTWARD, not inward), do not use blind Euler rotations. 
  *Method 1 (LookAt):* Use `mesh.lookAt(targetVector)` to align the local positive Z-axis to the target.
  *Method 2 (Axis Alignment):* If the geometry points along Y (like a cylinder), calculate the rotation needed to align local Y to the desired global direction vector, or use a parent `THREE.Object3D` to handle the rotation while the child mesh handles the local offset.
- Hierarchical Grouping: Use `THREE.Group` for joints. Translate the child mesh to its local offset, then rotate the parent Group. This prevents coordinate system confusion.

6. EXAMPLE OF ARCHITECTURAL THINKING
Request: "Create a medical syringe with a plunger, a barrel, and a needle."
Mental Process: A syringe is a hybrid object. The barrel and plunger are simple primitives, but the needle is a complex tapered tube. The needle must point strictly OUTWARD from the barrel, and no parts should have hollow holes.
Implementation Strategy:
1. Decompose: Syringe = Barrel (Primitive), Plunger (Primitive), Needle (Complex), Rubber Seal (Primitive).
2. Barrel & Plunger: Use `THREE.CylinderGeometry` (openEnded: false for the barrel to make it look solid, or use a slightly smaller inner cylinder for the hollow look, capped with a transparent material).
3. Needle (Complex & Capped): Use `THREE.CatmullRomCurve3` (just a straight line for the needle) and `THREE.TubeGeometry` with `radialSegments: 8`. To prevent a hollow hole at the base of the needle where it meets the barrel, apply a small `THREE.CylinderGeometry` flange at the base.
4. Spatial Alignment (CRITICAL): 
   - The needle must point OUT. Since `TubeGeometry` follows the curve, ensure the curve points from the barrel center towards the positive Y (or Z) axis. 
   - If the needle needs to point in an arbitrary direction, place the needle mesh inside a `THREE.Group`, translate the needle mesh so its base is at `(0,0,0)`, and then rotate the `Group` using `group.lookAt(outwardTargetVector)`.
5. Assembly: Group all parts. Ensure the plunger is translated down the Y-axis to sit inside the barrel, and the needle is translated up the Y-axis to protrude from the top.
