/**
 * Configuration for 3D Bearing Model and HDRI Environment.
 * 
 * When your custom 3D model and HDRI files are ready:
 * 1. Put your 3D model (.glb / .gltf) into public/models/
 * 2. Put your HDR environment map (.hdr) into public/hdri/
 * 3. Update modelUrl and hdrUrl below.
 */
export const BEARING_MODEL_CONFIG = {
  // Custom model file path (null = uses high-fidelity procedural dummy 3D model)
  modelUrl: null, // e.g. '/models/nsk_deep_groove_6208.glb'

  // Custom HDRI reflection map (null = uses built-in Three.js studio RoomEnvironment)
  hdrUrl: null, // e.g. '/hdri/industrial_studio_1k.hdr'

  // Material and lighting presets
  steelColor: 0xdde3ea,        // NSK Chrome Steel (SUJ2)
  steelMetalness: 0.96,
  steelRoughness: 0.12,
  ballMetalness: 1.0,
  ballRoughness: 0.03,         // Mirror polish
  cageColor: 0xd4af37,         // Machined brass cage
  cageMetalness: 0.85,
  cageRoughness: 0.25,
};

export default BEARING_MODEL_CONFIG;
