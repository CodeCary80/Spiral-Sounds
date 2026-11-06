// The slice of three.js the site uses, bundled into public/vendor/three.min.js by
// `npm run build:three`. The site has no build step, so the browser imports that
// file directly; add a name here (and rebuild) if public/js/vinyl3d.js needs more.
export {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, RingGeometry, LatheGeometry, CylinderGeometry,
  MeshBasicMaterial, Texture, Vector2, Vector3, Quaternion, Euler, MathUtils, SRGBColorSpace, NoToneMapping, BackSide,
} from 'three'
