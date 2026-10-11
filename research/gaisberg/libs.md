# Gaisberg renderer: three.js rendering libraries (vanilla, no React)

Scope: investigation for the vanilla three.js app (no React Three Fiber) with
`three@0.186.1`, `postprocessing@6.39.5` (EffectComposer, HalfFloatType,
multisampling 4), `WebGLRenderer({ logarithmicDepthBuffer: true })`, a local
metric world (Web-Mercator-derived, Y up, metres) around lat 47.8 N, lon 13.1 E,
and MeshLambert/MeshStandard materials patched through `onBeforeCompile` for
custom fog.

Method: packages installed into a scratch directory
(`scratchpad/libprobe`), then read from `package.json`, `types/*.d.ts`, `src/`,
`README.md` and the bundled `build/` output. Behaviour claims marked
"source-verified" were checked in code. Nothing was run in a browser, so
runtime behaviour (artifacts, FPS, log-depth correctness on a GPU) is **not
verified** and is listed in section 10.

Note: the `@takram` packages ship only `build/`, `src/`, `types/`, `assets/`.
The GitHub README links point at the monorepo; the local READMEs were used.

---

## 0. Versions and compatibility matrix

| Package | Latest (checked) | peerDependencies (relevant) | Works with three 0.186.1 + postprocessing 6.39.5? | Works without React? |
|---|---|---|---|---|
| `three` | 0.186.1 | none | n/a (baseline) | n/a |
| `postprocessing` | 6.39.5 | `three: ">= 0.168.0 < 0.187.0"` | yes, 0.186.1 is inside the range | n/a |
| `@takram/three-atmosphere` | 0.19.1 | `postprocessing >=6.36.7`, `three >=0.170.0`, react/R3F/drei all **optional** | yes on peer ranges; not run | yes. Root entry (`build/index.js`) re-exports its `shared*.js` chunks; React is only imported from `build/r3f.js` |
| `@takram/three-clouds` | 0.7.6 | `postprocessing >=6.36.7`, `three >=0.170.0`, R3F optional | yes on peer ranges; not run | yes. Root imports: `three`, `@takram/three-geospatial`, `./shared.js` |
| `@takram/three-geospatial` | 0.9.1 | `three >=0.170.0`, R3F/react optional | yes | yes. Root imports `three`, `three/addons/loaders/EXRLoader.js` |
| `@takram/three-geospatial-effects` | 0.6.4 | `postprocessing >=6.36.4`, `three >=0.170.0`, R3F optional | yes | yes. Root imports `postprocessing`, `@takram/three-geospatial` |
| `n8ao` | 2.0.1 (2026-08-10) | `postprocessing >=6.30.0`, `three >=0.137` | yes. `N8AOPostPass` imports `Pass` from `postprocessing` (not three's Pass) | yes |

Dependency pins to be aware of: `@takram/three-atmosphere@0.19.1` depends on
`@takram/three-geospatial@0.9.1`, `astronomy-engine ^2.1.19`,
`react-merge-refs`, `tiny-invariant`, `url-join`. `@takram/three-geospatial`
depends on `@petamoriken/float16 ^3.9.3` (float16 polyfill for data textures).

Mixing: `three-clouds@0.7.6` depends on `three-atmosphere@0.19.1` and
`three-geospatial@0.9.1`, so the three takram packages must be installed at the
same version family, or the duplicate `three-geospatial` copies will both
ship shader includes. Install the three takram packages together.

No blocking peer-range conflict was found with three 0.186.1 or
postprocessing 6.39.5.

---

## 1. @takram/three-atmosphere (0.19.1)

### What it provides (exports from `src/index.ts`)

```ts
export * from './AerialPerspectiveEffect'
export * from './AtmosphereMaterialBase'
export * from './AtmosphereParameters'
export * from './celestialDirections'     // getSunDirectionECEF, getMoonDirectionECEF, getECIToECEFRotationMatrix
export * from './constants'               // DEFAULT_PRECOMPUTED_TEXTURES_URL, ...
export * from './getAltitudeCorrectionOffset'
export * from './getSunLightColor'
export * from './LightingMaskPass'
export * from './PrecomputedTexturesGenerator'
export * from './PrecomputedTexturesLoader'
export * from './SkyLightProbe'
export * from './SkyMaterial'
export * from './StarsGeometry'
export * from './StarsMaterial'
export * from './SunDirectionalLight'
```

### Two lighting paths (README, "Usage")

- **Post-process lighting**: `AerialPerspectiveEffect` with `sunLight` and
  `skyLight` set. Requires **unlit** materials (`MeshBasicMaterial`), Lambert
  BRDF only. Not suitable for your Lambert/Standard + CSM setup.
- **Light-source lighting**: `SunDirectionalLight` and `SkyLightProbe` feed
  ordinary three.js materials, and `AerialPerspectiveEffect` only does
  transmittance and inscatter. This is the path that works with
  MeshLambert/MeshStandard. README quote:
  > Compatible with built-in Three.js materials and shadows, but both direct and
  > indirect irradiance are approximated only for small-scale scenes.

  README "Note on lighting methods", rule of thumb:
  > Don't enable `sunLight` or `skyLight` on `AerialPerspectiveEffect` when using
  > `SunDirectionalLight` and `SkyLightProbe`, unless correctly masked using
  > `LightingMaskPass`.

### Vanilla API (from README "Vanilla Three.js", quoted and trimmed)

```ts
const position = new Vector3(/* ECEF coordinate in meters */)

// SkyMaterial disables projection. Provide a plane that covers clip space.
const skyMaterial = new SkyMaterial()
const sky = new Mesh(new PlaneGeometry(2, 2), skyMaterial)
sky.frustumCulled = false
sky.position.copy(position)
scene.add(sky)

// SkyLightProbe computes sky irradiance of its position.
const skyLight = new SkyLightProbe()
skyLight.position.copy(position)
scene.add(skyLight)

// SunDirectionalLight computes sunlight transmittance to its target position.
const sunLight = new SunDirectionalLight()
sunLight.target.position.copy(position)
scene.add(sunLight)
scene.add(sunLight.target)

// Light-source lighting here. For post-process lighting, set sunLight and
// skyLight to true, remove SkyLightProbe and SunDirectionalLight, and provide a
// normal buffer to AerialPerspectiveEffect.
const aerialPerspective = new AerialPerspectiveEffect(camera)

// Use floating-point render buffer, as radiance/luminance is stored here.
const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType })
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new EffectPass(camera, aerialPerspective,
  new ToneMappingEffect({ mode: ToneMappingMode.AGX })))

const generator = new PrecomputedTexturesGenerator(renderer)
generator.update().catch((error: unknown) => { console.error(error) })

const { textures } = generator
Object.assign(skyMaterial, textures)
sunLight.transmittanceTexture = textures.transmittanceTexture
skyLight.irradianceTexture = textures.irradianceTexture
Object.assign(aerialPerspective, textures)

const sunDirection = new Vector3()
const moonDirection = new Vector3()

function render(): void {
  // Suppose `date` is updated elsewhere.
  getSunDirectionECEF(date, sunDirection)
  getMoonDirectionECEF(date, moonDirection)

  skyMaterial.sunDirection.copy(sunDirection)
  skyMaterial.moonDirection.copy(moonDirection)
  sunLight.sunDirection.copy(sunDirection)
  skyLight.sunDirection.copy(sunDirection)
  aerialPerspective.sunDirection.copy(sunDirection)

  sunLight.update()
  skyLight.update()
  composer.render()
}
```

Notes on the snippet:
- `generator.update()` is async. Before it resolves, `generator.textures` is not
  usable. The README's "Suspend" recipe shows the same thing with `await`.
- `Object.assign(aerialPerspective, textures)` works because the effect has
  setters for `irradianceTexture`, `scatteringTexture`, `transmittanceTexture`,
  `singleMieScatteringTexture`, `higherOrderScatteringTexture` (types/AerialPerspectiveEffect.d.ts).
- `SkyMaterial` is the sky dome. With the light-source path, the README uses
  the mesh, not the AP `sky` flag. The AP `sky` option is for post-process
  mode (`<AerialPerspective sky sunLight skyLight />`). Pick one.

### Class signatures (types/*.d.ts)

```ts
class AerialPerspectiveEffect extends Effect {
  constructor(camera?: Camera, options?: AerialPerspectiveEffectOptions, atmosphere?: AtmosphereParameters)
  overlay: AtmosphereOverlay | null
  shadow: AtmosphereShadow | null
  shadowLength: AtmosphereShadowLength | null
  lightingMask: AtmosphereLightingMask | null
  get worldToECEFMatrix(): Matrix4          // getter only: copy into it
  get sunDirection(): Vector3                // getter only: copy into it
  ellipsoid: Ellipsoid; correctAltitude: boolean; correctGeometricError: boolean
  sunLight: boolean; skyLight: boolean; transmittance: boolean; inscatter: boolean
  sky: boolean; sun: boolean; moon: boolean; ground: boolean
  albedoScale: number; shadowRadius: number; shadowSampleCount: number
  normalBuffer: Texture | null; reconstructNormal: boolean; octEncodedNormal: boolean
}

class SkyMaterial extends AtmosphereMaterialBase {
  constructor(params?: SkyMaterialParameters)  // sun, moon, moonDirection, moonAngularRadius, lunarRadianceScale, ground, groundAlbedo
  shadowLength: AtmosphereShadowLength | null
}

class SunDirectionalLight extends DirectionalLight {
  constructor(params?: SunDirectionalLightParameters, atmosphere?: AtmosphereParameters)
  // params: transmittanceTexture?, ellipsoid?, correctAltitude?, sunDirection?, distance?
  transmittanceTexture: Texture | null
  readonly worldToECEFMatrix: Matrix4       // copy into it
  readonly sunDirection: Vector3            // copy into it
  distance: number
  update(): void
}

class SkyLightProbe extends LightProbe {
  constructor(params?: SkyLightProbeParameters, atmosphere?: AtmosphereParameters)
  // params: irradianceTexture?, ellipsoid?, correctAltitude?, sunDirection?
  irradianceTexture: Texture | null
  readonly worldToECEFMatrix: Matrix4
  readonly sunDirection: Vector3
  update(): void
}

class PrecomputedTexturesGenerator {
  constructor(renderer: WebGLRenderer, options?: { type?: AnyFloatType; combinedScattering?: boolean; higherOrderScattering?: boolean })
  readonly textures: PrecomputedTextures
  update(atmosphere?: AtmosphereParameters): Promise<PrecomputedTextures>
  dispose(options?: { textures?: boolean }): void
}

class PrecomputedTexturesLoader extends Loader<PrecomputedTextures> {
  constructor(options?: { format?: 'binary' | 'exr'; type?: AnyFloatType; combinedScattering?: boolean; higherOrderScattering?: boolean }, manager?: LoadingManager)
  setType(renderer: WebGLRenderer): this    // FloatType if linear filtering supported, else HalfFloatType
  load(url: string, onLoad?, onProgress?, onError?): PrecomputedTextures
}

function getSunDirectionECEF(date: number | Date, result?: Vector3): Vector3
function getMoonDirectionECEF(date: number | Date, result?: Vector3): Vector3
function getECIToECEFRotationMatrix(date: number | Date, result?: Matrix4): Matrix4
function getSunLightColor(transmittanceTexture: Texture, worldPosition: Vector3, sunDirection: Vector3, result?: Color, options?: { ellipsoid?, correctAltitude? }): Color
```

### Required assets and where they come from

- The precomputed LUTs are required: `transmittance`, `scattering`,
  `irradiance`, optional `single_mie_scattering`, optional `higher_order_scattering`.
- Either generate them at runtime with `PrecomputedTexturesGenerator(renderer).update()`,
  or load the shipped files. Both paths are in the package.
- The shipped `assets/` folder inside the npm package contains `.bin` (Float or
  half-float raw) and `.exr` versions. Sizes on disk in the installed package:
  `scattering.bin` 8 MiB, `single_mie_scattering.bin` 8 MiB,
  `higher_order_scattering.bin` 8 MiB, `transmittance.bin` 128 KiB,
  `irradiance.bin` 8 KiB, `stars.bin` 89 KiB. The `.exr` set is about 9.7 MB total.
- **The default URL is remote**: `DEFAULT_PRECOMPUTED_TEXTURES_URL` is
  `https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/<sha>/packages/atmosphere/assets`
  (constants.ts). The README and the r3f wrapper use it. For a vanilla app, copy
  `node_modules/@takram/three-atmosphere/assets/*.bin` into your static folder and
  pass that directory to the loader, rather than depending on the GitHub URL.

Loader recipe (README "Non-blocking texture loading", vanilla form):

```ts
const loader = new PrecomputedTexturesLoader({ format: 'binary' })
loader.setType(renderer)
const textures = loader.load('/atmosphere/')   // directory containing the .bin files
```

The README loader recipes use `load(url)` on the directory. The returned object
fills in asynchronously, so use the README `PrecomputedTexturesLoader` recipe as
the reference.

### How it hooks into EffectComposer

- `AerialPerspectiveEffect` is a `postprocessing` `Effect`. Put it in an
  `EffectPass` with the camera, the same way as any other effect:
  `composer.addPass(new EffectPass(camera, aerialPerspective, new ToneMappingEffect(...)))`.
- It needs depth: `AerialPerspectiveEffect` has `EffectAttribute.DEPTH`
  (AerialPerspectiveEffect.ts:240), so the composer creates the stable depth
  texture for it.
- It reads the `cameraNear`/`cameraFar` uniforms that `postprocessing` sets from
  the camera of the `EffectPass`. Pass the same camera to every `EffectPass`
  (postprocessing.js:5284, 14769).
- `EffectComposer` must use `frameBufferType: HalfFloatType` (README: "Use
  floating-point render buffer, as radiance/luminance is stored here.").

### Coordinate-system assumptions

- **The reference frame is ECEF, fixed**. README "Limitations":
  > The reference frame is fixed to ECEF and cannot be configured, #11.
- Sun and moon directions are **ECEF** (`getSunDirectionECEF`, README: "Obtains
  the direction to the sun and moon in ECEF coordinates for the specified UTC
  time").
- Scene coordinates are **world**; the matrix `worldToECEFMatrix` converts them.
  Quote from README `Atmosphere` props:
  > The matrix for converting world coordinates to ECEF coordinates. Use this
  > matrix to define a reference frame or, more commonly, to orient the ellipsoid
  > for working near the world space origin and adapting to Three.js's Y-up
  > coordinate system. The default value is an identity matrix, and it must be
  > orthogonal and consist only of translation and rotation (no scaling).

  So **the world units must be metres of real ECEF size**. Any scale in your
  projection breaks the atmosphere. See section 8.
- Example from README to orient a local frame at a geodetic point (vanilla
  equivalent of the R3F example):

```ts
import { Ellipsoid, Geodetic } from '@takram/three-geospatial'
import { Matrix4, Vector3 } from 'three'

const DEG = Math.PI / 180
const originECEF = new Geodetic(13.1 * DEG, 47.8 * DEG, 0).toECEF()  // Geodetic: radians
const east = new Vector3(), north = new Vector3(), up = new Vector3()
Ellipsoid.WGS84.getEastNorthUpVectors(originECEF, east, north, up)

// README uses makeBasis(north, up, east) to get X north, Y up, Z east.
// For your frame choose the axis mapping you actually use. Example below is
// X east, Y up, Z south (= -north), which is right-handed:
const worldToECEF = new Matrix4()
  .makeBasis(east, up, north.clone().negate())
  .setPosition(originECEF)

// Or use the helper from README: Ellipsoid.WGS84.getNorthUpEastFrame(originECEF, worldToECEF)
```

`Geodetic` takes **radians** (constructor and `MIN_LONGITUDE = -Math.PI`).
`Ellipsoid.WGS84` is a static instance (types/Ellipsoid.d.ts).

Update per frame:

```ts
getSunDirectionECEF(date, sunDirECEF)          // ECEF
aerial.worldToECEFMatrix.copy(worldToECEF)     // getter only, copy into it
aerial.sunDirection.copy(sunDirECEF)
sunLight.worldToECEFMatrix.copy(worldToECEF)
sunLight.sunDirection.copy(sunDirECEF)
sunLight.update()
skyLight.worldToECEFMatrix.copy(worldToECEF)
skyLight.sunDirection.copy(sunDirECEF)
skyLight.update()
```

`SunDirectionalLight.update()` (source, SunDirectionalLight.ts:60-66) converts
the ECEF sun direction to world with the transposed rotation of
`worldToECEFMatrix`. Use the same conversion when you need the sun direction in
world space (for example for CSM, section 5):

```ts
const ecefToWorld = new Matrix3().setFromMatrix4(worldToECEF).transpose()
const sunDirWorld = sunDirECEF.clone().applyMatrix3(ecefToWorld).normalize()
```

### logarithmicDepthBuffer

**Supported, source-verified, not runtime-tested.**

- The depth read path calls `reverseLogDepth(depth, cameraNear, cameraFar)` when
  reading the depth texture (`src/shaders/aerialPerspectiveEffect.frag:319`).
- `reverseLogDepth` is defined in `three-geospatial/src/shaders/depth.glsl:13-21`
  and only decodes when `USE_LOGDEPTHBUF` or `USE_LOGARITHMIC_DEPTH_BUFFER` is
  defined.
- three sets `USE_LOGARITHMIC_DEPTH_BUFFER` on non-raw materials when
  `parameters.logarithmicDepthBuffer` is true (`three/src/renderers/webgl/WebGLProgram.js:596` and `:767`).
  postprocessing's `EffectMaterial` extends `THREE.ShaderMaterial`
  (postprocessing.js:14746), so the define is applied to the atmosphere pass
  automatically.
- Sky pixels: `if (depth >= 1.0 - 1e-8)` is tested **before** the log decode
  (aerialPerspectiveEffect.frag:297-298). Log-encoded far depth is 1.0 at the far
  plane, so sky detection still works.

Risk to check: the `SkyMaterial` mesh is drawn as a plane with projection
disabled. Under log depth its `gl_FragDepth` will be written. Check that it does not
break the depth test for scene geometry behind it.

### Performance notes

- Precompute cost is one-time. It is a WebGL pass over the LUTs (cost not
  measured here).
- Light-source path: `SunDirectionalLight.update()` and `SkyLightProbe.update()`
  sample the LUTs on the CPU. Cheap, once per frame.
- The post-process path shades every pixel with ray-marched LUT lookups plus
  optional cloud shadow sampling. Shadow sampling is multiplied by
  `shadowSampleCount` (1 to 16, `@defineInt`).

---

## 2. @takram/three-clouds (0.7.6)

### What it provides

```ts
export * from './CloudLayer'
export * from './CloudLayers'
export * from './CloudsEffect'
export * from './CloudShape'
export * from './CloudShapeDetail'
export * from './constants'
export * from './DensityProfile'
export * from './LocalWeather'
export * from './Procedural3DTexture'
export * from './ProceduralTexture'
export * from './Turbulence'
```

`CloudsEffect` is the main class. Its README calls it a buffer-producing effect:
> A post-processing effect that renders volumetric clouds. Although it is an
> effect and can render as a standalone, it is primarily intended to render clouds
> into buffers and then composited in `AerialPerspectiveEffect`.

### Vanilla API

```ts
class CloudsEffect extends Effect {
  constructor(camera?: Camera, options?: CloudsEffectOptions, atmosphere?: AtmosphereParameters)
  // options: resolutionScale?, width?, height?, resolutionX?, resolutionY?

  cloudLayers: CloudLayers              // readonly
  readonly clouds: CloudsShorthand      // uniform shorthand: maxIterationCount, minStepSize, ...
  readonly shadow: ShadowShorthand      // shadow march shorthand
  readonly shadowMaps: CascadedShadowMaps
  readonly shadowPass: ShadowPass
  readonly cloudsPass: CloudsPass
  readonly worldToECEFMatrix: Matrix4   // copy into it
  readonly sunDirection: Vector3        // copy into it
  readonly localWeatherRepeat: Vector2
  readonly localWeatherOffset: Vector2
  readonly shapeRepeat: Vector3
  readonly shapeOffset: Vector3
  readonly shapeDetailRepeat: Vector3
  readonly shapeDetailOffset: Vector3
  readonly turbulenceRepeat: Vector2
  readonly localWeatherVelocity: Vector2
  readonly shapeVelocity: Vector3
  readonly shapeDetailVelocity: Vector3

  set qualityPreset(value: 'low' | 'medium' | 'high' | 'ultra')
  localWeatherTexture: Texture | ProceduralTexture | null
  shapeTexture: Data3DTexture | Procedural3DTexture | null
  shapeDetailTexture: Data3DTexture | Procedural3DTexture | null
  turbulenceTexture: Texture | ProceduralTexture | null
  stbnTexture: Data3DTexture | null
  resolutionScale: number; temporalUpscale: boolean; lightShafts: boolean
  shapeDetail: boolean; turbulence: boolean; haze: boolean
  coverage: number; turbulenceDisplacement: number
  scatteringCoefficient: number; absorptionCoefficient: number
  scatterAnisotropy1: number; scatterAnisotropy2: number; scatterAnisotropyMix: number
  skyLightScale: number; groundBounceScale: number; powderScale: number; powderExponent: number

  // precomputed atmosphere textures, same names as AerialPerspectiveEffect
  irradianceTexture; scatteringTexture; transmittanceTexture
  singleMieScatteringTexture; higherOrderScatteringTexture
  ellipsoid: Ellipsoid; sunAngularRadius: number; correctAltitude: boolean

  // Outputs consumed by AerialPerspectiveEffect:
  get atmosphereOverlay(): AtmosphereOverlay | null
  get atmosphereShadow(): AtmosphereShadow | null
  get atmosphereShadowLength(): AtmosphereShadowLength | null
  readonly events: EventDispatcher<{ change: CloudsEffectChangeEvent }>
  skipRendering: boolean
}
```

Props are per-field (`coverage`, `qualityPreset`, `shadow.cascadeCount`, `clouds.maxIterationCount`, and so on).
`CloudLayer` and `CloudLayers` are objects for layered cloud configuration.
There is no README vanilla example. The vanilla surface above comes from
`types/CloudsEffect.d.ts` and `src/CloudsEffect.ts`.

### Required textures and their sources

The core class has **no default textures**. `localWeatherTexture` etc. start as
`null` (CloudsEffect.ts setters). Only the R3F wrapper applies defaults, and those
are remote URLs (`src/r3f/Clouds.tsx:144`: `localWeatherTexture: localWeatherTextureProp = DEFAULT_LOCAL_WEATHER_URL`).

| Texture | Property | Format and size (from r3f loader and constants.ts) | Shipped in npm `assets/`? |
|---|---|---|---|
| Local weather | `localWeatherTexture` | 2D RGB/RGBA PNG, tileable, each channel = one cloud layer's weather signal (README) | yes, `local_weather.png` (680 KB) |
| Shape | `shapeTexture` | 3D, 128^3, R8, tileable, R = inverse erosion (`CLOUD_SHAPE_TEXTURE_SIZE = 128`) | yes, `shape.bin` (2 MiB = 128^3 bytes) |
| Shape detail | `shapeDetailTexture` | 3D, 32^3, R8 (`CLOUD_SHAPE_DETAIL_TEXTURE_SIZE = 32`) | yes, `shape_detail.bin` (32 KiB) |
| Turbulence | `turbulenceTexture` | 2D PNG, tileable, RGB = 3D domain-distortion vector | yes, `turbulence.png` (50 KB) |
| STBN | `stbnTexture` | 3D blue-noise, 128 x 128 x 64 (`STBN_TEXTURE_*` in three-geospatial) | **no**. Remote `packages/core/assets/stbn.bin` from GitHub |

Loading recipe, vanilla. The R3F file shows the exact loaders:

```ts
// from src/r3f/Clouds.tsx
new TextureLoader().load(input)                       // local weather, turbulence (PNG)
new DataTextureLoader(Data3DTexture, parseUint8Array, {
  width: size, height: size, depth: size,             // 128 for shape, 32 for shape detail
  format: RedFormat,
  minFilter: LinearFilter, magFilter: LinearFilter,
  wrapS: RepeatWrapping, wrapT: RepeatWrapping, wrapR: RepeatWrapping,
  colorSpace: NoColorSpace
}).load(input)                                        // shape, shape detail (.bin)
new STBNLoader().load(input)                          // STBN
```

`DataTextureLoader`, `parseUint8Array`, `STBNLoader` are exported by
`@takram/three-geospatial`. The three `shared` bundle is pulled through the
same entry.

Self-host the files: copy `node_modules/@takram/three-clouds/assets/*` into your
static directory. Get `stbn.bin` from the GitHub repo or skip it (README says it is
"not required, but omitting it will make spatial and temporal aliasing highly
noticeable").

Procedural alternative (README "Generating textures procedurally"):
```ts
const localWeatherTexture = new ProceduralTextureBase({ size: 512, fragmentShader: /* glsl */ `...` })
```
`ProceduralTextureBase` is exported from `@takram/three-clouds`.

### How it chains with AerialPerspectiveEffect

Clouds are rendered into a buffer and composited in the aerial-perspective
pass. The README's order is "Place Clouds before AerialPerspective":

```tsx
<EffectComposer enableNormalPass>
  <Clouds qualityPreset='high' coverage={0.4} />
  <AerialPerspective sky sunLight skyLight />
</EffectComposer>
```

Vanilla equivalent (see section 7 for the full composer). The wiring is through
properties and events:

- `AerialPerspectiveEffect.overlay` receives `cloudsEffect.atmosphereOverlay`
  (the cloud color/alpha buffer).
- `.shadow` receives `atmosphereShadow` (cascaded shadow map of the sun,
  rendered by `ShadowPass`).
- `.shadowLength` receives `atmosphereShadowLength` (for light shafts).
- These three values change when the clouds effect rebuilds. The
  `change` event tells you which one: `CloudsEffectChangeEvent.property` is
  `'atmosphereOverlay' | 'atmosphereShadow' | 'atmosphereShadowLength'`. The R3F
  wrapper does exactly this (`src/r3f/Clouds.tsx:178-210`).

**Shadows on the scene**: clouds shadow the scene **only through AerialPerspective's
post-process lighting** (`#if defined(SUN_LIGHT) || defined(SKY_LIGHT)` block,
aerialPerspectiveEffect.frag:102-129, where `shadow` is sampled at line 116). With
the light-source path (SunDirectionalLight + Lambert/Standard), the cloud shadow
does **not** reach your lit materials. The `SunDirectionalLight` shadow map is
unaware of clouds. See section 10.

Per-frame wiring:

```ts
clouds.worldToECEFMatrix.copy(worldToECEF)   // readonly ref, copy into it
clouds.sunDirection.copy(sunDirECEF)
```

`CloudsEffect.setDepthTexture(depthTexture, depthPacking?)` is overridden and
forwards to both shadow and cloud passes (CloudsEffect.ts:497-503), so the
composer's depth must be available (`EffectAttribute.DEPTH`).

### Log depth

**Supported, explicitly handled.** `CloudsMaterial.ts:275-282` sets
`USE_LOGARITHMIC_DEPTH_BUFFER` from `renderer.capabilities.logarithmicDepthBuffer`
at render time. `clouds.frag` decodes depth with
`perspectiveDepthToViewZ(depth, cameraNear, cameraFar)` (`clouds.frag:103`, with
`reverseLogDepth` gated by the same define as in atmosphere). Not runtime-tested.

### Quality and cost

From the README "Performance tweaks" table (measured by the author, not by me):

| Device | Preset | Temporal upscaling | FPS |
|---|---|---|---|
| iPhone 13, Safari | Low | yes | 36-53 |
| iPad Pro M4, Safari | Medium | yes | 60 |
| iPad Pro M4, Safari | High | yes | 43-55 |
| MacBook Pro M3 Max, Chrome, 4K | High | yes | 92-95 |
| MacBook Pro M3 Max, Chrome, 4K | Ultra | yes | 76-77 |
| MacBook Pro M3 Max, Chrome, 4K | High | **no** | 31 |

Preset table (src/qualityPresets.ts): `low` disables `lightShafts`, `shapeDetail`,
`turbulence`; `medium` disables `lightShafts` and `turbulence`; `high` is the
baseline; `ultra` increases BSM resolution. Default `shadow.cascadeCount = 3`,
`shadow.mapSize = 512x512`, `clouds.maxIterationCount = 500`.

Limits (README): at most **4 cloud layers**. Known issues include temporal
upscaling ghosting, and aerial perspective applied to clouds through a
transmittance-weighted mean depth.

---

## 3. @takram/three-geospatial (0.9.1) and @takram/three-geospatial-effects (0.6.4)

### @takram/three-geospatial: exports

```ts
export * from './ArrayBufferLoader'
export * from './bufferGeometry'
export * from './capabilities'
export * from './constants'          // DEFAULT_STBN_URL, STBN_TEXTURE_WIDTH/HEIGHT/DEPTH = 128/128/64
export * from './DataTextureLoader'  // DataTextureLoader(Data3DTexture, parseUint8Array, options)
export * from './decorators'
export * from './defineShorthand'
export * from './Ellipsoid'          // Ellipsoid, Ellipsoid.WGS84
export * from './EllipsoidGeometry'
export * from './EXR3DTextureLoader'
export * from './EXRTextureLoader'
export * from './Geodetic'           // Geodetic(lon, lat, h) in radians, toECEF / setFromECEF
export * from './math'
export * from './PointOfView'
export * from './QuadGeometry'
export * from './Rectangle'
export * from './resolveIncludes'
export * from './STBNLoader'
export * from './TileCoordinate'
export * from './TilingScheme'
export * from './typedArray'
export * from './TypedArrayLoader'
export * from './typedArrayParsers' // parseUint8Array, parseFloat16Array, ...
export * from './types'
export * from './unrollLoops'
```

Used directly:

- `Ellipsoid` (types/Ellipsoid.d.ts): `static WGS84`, `radii: Vector3`,
  `getEastNorthUpFrame(position, result?: Matrix4)`, `getNorthUpEastFrame`,
  `getEastNorthUpVectors(position, east?, north?, up?)`, `getSurfaceNormal`,
  `projectOnSurface`, `getIntersection(ray)`, `getNormalAtHorizon`,
  `getOsculatingSphereCenter`.
- `Geodetic` (types/Geodetic.d.ts): `new Geodetic(longitude, latitude, height)`,
  all **radians**, `toECEF(result?, { ellipsoid? })`, `setFromECEF(position, options?)`,
  `set/clone/copy/equals/normalize`.
- Loaders: `DataTextureLoader` (used for shape textures), `STBNLoader`,
  `TypedArrayLoader`, `EXRTextureLoader`, `EXR3DTextureLoader`.
- `TilingScheme`, `TileCoordinate`, `Rectangle`: tile helpers. Not evaluated
  for Web-Mercator alignment. Check before using them to derive local
  coordinates.

The README is one line of purpose only:
> Provides fundamental functions for rendering GIS data in Three.js and R3F.

### @takram/three-geospatial-effects: exports (src/index.ts)

```ts
export * from './createHaldLookupTexture'
export * from './DepthEffect'
export * from './DitheringEffect'
export * from './GeometryPass'
export * from './LensFlareEffect'
export * from './NormalEffect'
export * from './setupMaterialsForGeometryPass'
```

Effect by effect:

- **`DepthEffect(options?: { blendFunction?, useTurbo?, near?, far? })`**
  Visualizes depth. Uses `reverseLogDepth` (src/shaders/depthEffect.frag:9), so it
  handles log depth. Debug only.
- **`NormalEffect(camera, options?: { blendFunction?, normalBuffer?, octEncoded?, reconstructFromDepth? })`**
  Normal visualization or reconstruction. `reconstructFromDepth` uses
  `reverseLogDepth` (normalEffect.frag:12). Use it if you need normals without a
  NormalPass. Note that AerialPerspective has its own `reconstructNormal` option.
- **`DitheringEffect(options?: { blendFunction? })`**
  Adds dither from three's `dithering_pars_fragment` chunk
  (`#define DITHERING`, `ditheringEffect.frag`). Use it as the **last** effect,
  after tone mapping, to kill 8-bit banding in the sky.
- **`LensFlareEffect(options?: { blendFunction?, resolutionScale?, width?, height?, resolutionX?, resolutionY?, intensity? })`**
  Source (`src/LensFlareEffect.ts`): threshold on the input (`DownsampleThresholdMaterial`),
  `MipmapBlurPass` (8 levels) for bloom, `KawaseBlurPass` preblur, then
  `LensFlareFeaturesMaterial` for ghosts, halos and chromatic aberration (uniforms
  `ghostAmount`, `haloAmount`, `chromaticAberration`). It does **not** need a
  light source object; it works from bright input pixels. Properties: `intensity`,
  `thresholdLevel`, `thresholdRange`. Uses `HalfFloatType` internally.
- **`GeometryEffect` / `GeometryPass` / `setupMaterialsForGeometryPass`**
  Writes normals or PBR data into a second buffer. `setupMaterialsForGeometryPass()`
  **mutates the global `THREE.ShaderLib` entries** (src/setupMaterialsForGeometryPass.ts:
  it adds `#include <normal_pars_vertex>` etc. to standard materials). That affects
  every Lambert/Standard material compiled afterwards, which includes your
  onBeforeCompile-patched fog materials. Do not call it unless you need the geometry buffer.
- **`createHaldLookupTexture(texture: Texture): LookupTexture`**
  Turns a Hald CLUT image into a `postprocessing` `LookupTexture`, for `LUT3DEffect` (section 6).

### Log depth

- `DepthEffect` and `NormalEffect` decode log depth explicitly.
- `GeometryPass` and `setupMaterialsForGeometryPass` do not add log-depth handling.
  The geometry pass depth is whatever three writes.

### Coordinate assumptions

These packages are coordinate-agnostic. `Ellipsoid` and `Geodetic` assume
**ECEF metres** (WGS84 radii, `Ellipsoid.WGS84`). Anything that uses them with your
local frame must go through a `worldToECEF` matrix (section 8).

---

## 4. n8ao (2.0.1): N8AOPostPass

### Import and placement

From the README ("Usage (Postprocessing)"):

```js
import { N8AOPostPass } from "n8ao";
import { EffectComposer, RenderPass } from "postprocessing";

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));          // N8AOPostPass needs a RenderPass before it
const n8aopass = new N8AOPostPass(scene, camera, width, height);
composer.addPass(n8aopass);
```

> The only difference is that N8AOPostPass requires a RenderPass before it, whereas N8AOPass replaces the render pass.

Source check: `src/N8AOPostPass.js` (`class N8AOPostPass extends Pass`, imported from
`postprocessing`, line 2). `dist/N8AO.js` exports `DepthType`, `N8AOPass`,
`N8AOPostPass`.

### Options (`configuration`, from the default object in the constructor, N8AOPostPass.js:82-100)

Defaults: `aoRadius` (see below), `distanceFalloff`, `intensity: 5`,
`denoiseIterations: 2`, `renderMode: 0`, `biasOffset: 0`, `biasMultiplier: 0`,
`color: Color(0,0,0)`, `gammaCorrection: true`, `depthBufferType: DepthType.Default`,
`screenSpaceRadius: false`, `halfRes: false`, `depthAwareUpsampling: true`,
`colorMultiply: true`, `transparencyAware: false`, `accumulate: false`,
`neuralDenoise: false`, plus `aoSamples`, `denoiseSamples`, `denoiseRadius`
(set by quality mode, default `Medium`).

Quotes:

- `aoRadius: number`: "Controls the radius/size of the ambient occlusion in world units.
  … The radius should be one or two magnitudes less than scene scale: if your scene is
  10 units across, the radius should be between 0.1 and 1. If its 100, 1 to 10."
  For metres of local world, start with 2 to 10 m.
- `distanceFalloff`: "Defaults to 1 … choosing 1.0 is a safe value." (migration notice: API changed in 1.7)
- `intensity`: "runs the ao through the function pow(ao, intensity)"
- `color`: "The color of the ambient occlusion. By default, it is black."
- `halfRes`: "This will cause the AO to be calculated at half the resolution of the screen,
  and then upscaled to the full resolution. This is a great way to get a performance
  boost (generally 2x-4x) at the cost of some quality."
- `depthAwareUpsampling`: "The AO effect looks horrible without depth-aware upscaling, so it is not
  recommended to disable it."
- `transparencyAware`: "all transparent objects **will be rendered twice**." (source:
  `renderTransparency()` calls `renderer.render(this.scene, this.camera)` twice,
  N8AOPostPass.js:380-420.)
- `gammaCorrection`: auto-set when used through `N8AOPostPass`: "If it is the last pass,
  it is set to true. Otherwise, it is set to false." Set it explicitly when AO is
  before tone mapping.
- `screenSpaceRadius`: aoRadius in pixels (16 to 64 recommended).
- `neuralDenoise`: "Neural-Low / Medium / High" via `setQualityMode(...)`, 16 AO samples,
  full resolution. Adds GPU cost.
- `aoTones`, `biasOffset`, `biasMultiplier`, `accumulate` (only when camera is still),
  `stencil` (N8AOPass only, not PostPass).

Quality modes (`setQualityMode(mode)`, README table):

| Mode | AO samples | Denoise samples | Neural |
|---|---|---|---|
| Performance | 8 | 4 | no |
| Low | 16 | 4 | no |
| Medium (default) | 16 | 8 | no |
| High | 64 | 8 | no |
| Ultra | 64 | 16 | no |
| Neural-Low / Medium / High | 16 | 4 / 8 / 16 | yes |

Changing `aoSamples`, `denoiseSamples` or `denoiseRadius` forces a shader recompile.
Do it once at start-up.

### Cost

- README: half-res mode "generally 2x-4x" faster. Depth-aware upsampling "generally
  … a fixed cost of around 1ms".
- The pass renders its own depth-downsample quad when `halfRes`.
- The `transparencyAware` path re-renders the scene twice, which is expensive for
  large transparent coverage. Keep it off unless you need it.

### Logarithmic depth

**Supported explicitly.** `N8AOPostPass.render()` reads
`renderer.capabilities.logarithmicDepthBuffer` each frame and switches to
`DepthType.Log` (N8AOPostPass.js:628-640). The shaders then compile with
`#define LOGDEPTH` (dist/N8AO.js:1929, 2694, and similar). README: "It works with
logarithmic depth buffers and orthographic cameras."

### MSAA and half-float

- Works with the composer's `multisampling` and `frameBufferType`. README example uses
  `HalfFloatType` and `stencilBuffer: true`. The `N8AOPostPass` does not need its own
  render target for the scene; it reads the composer's input buffer and depth.
- The depth texture comes from postprocessing's `needsDepthTexture` path
  (N8AOPostPass sets `this.needsDepthTexture = true`, line 261). With multisampling,
  postprocessing blits depth from the MSAA buffer into the stable depth texture
  (`blitDepthBuffer`, postprocessing.js:1240-1262). That blit keeps one depth sample per
  pixel, so MSAA edges will not match AO edges exactly.
- README: "Use of SMAAPass (as hardware antialiasing does NOT work with ambient occlusion)
  is recommended to reduce aliasing." With composer MSAA, keep the composer MSAA and
  add SMAA only if you still see stair-steps on AO halos.

### Fog

N8AO reads `scene.fog` (only `Fog` and `FogExp2`) to apply fog to the AO result
(N8AOPostPass.js:~800-815). Your fog is custom and goes through `onBeforeCompile`, so
`scene.fog` stays null and N8AO does nothing extra. Fine for you.

### WebGPU

README: "N8AO is not yet compatible with WebGPU."

---

## 5. three addons (three@0.186.1): CSM and GTAO/SSAO

### 5a. CSM: `three/examples/jsm/csm/CSM.js`

Source confirms the API below. README/examples are not shipped in the npm package; the
JSDoc comments are the reference.

```js
import { CSM } from 'three/addons/csm/CSM.js';

const csm = new CSM({
  camera,                 // the main camera (required)
  parent: scene,          // where the cascade lights are added (required)
  cascades: 3,            // default 3
  maxFar: 100000,         // default 100000; clamps shadow range
  mode: 'practical',      // 'uniform' | 'logarithmic' | 'practical' | 'custom'
  shadowMapSize: 2048,    // default 2048 (per cascade)
  shadowBias: 0.000001,
  lightDirection: new Vector3(1, -1, 1).normalize(),  // WORLD space
  lightIntensity: 3,      // default 3
  lightNear: 1,           // default 1
  lightFar: 2000,         // default 2000
  lightMargin: 200,       // default 200
  customSplitsCallback,   // only for mode 'custom'
});
csm.fade = false;         // cross-fade between cascades
```

Methods (CSM.js):

- `setupMaterial(material)`: sets `material.defines.USE_CSM = 1` and
  `CSM_CASCADES`, and replaces `material.onBeforeCompile` (see the caveat below).
- `update()`: call every frame. Re-orients the cascade lights along `lightDirection`.
- `updateFrustums()`: call when camera near/far or `maxFar` change.
- `remove()`, `dispose()`: `dispose()` deletes `onBeforeCompile` and the `USE_CSM` defines from
  every material passed to `setupMaterial`.
- `lights[]`: `DirectionalLight`s created internally, one per cascade, with
  `castShadow = true` and `shadow.mapSize = shadowMapSize`.
- `breaks[]`, `frustums[]`, `mainFrustum`, `shaders` (Map material to shader object).

Patching model (source-verified):

- `CSM.constructor` calls `_injectInclude()`, which **overwrites
  `ShaderChunk.lights_fragment_begin` and `ShaderChunk.lights_pars_begin` globally**
  (CSM.js:415-420). The new chunks are guarded by `#if defined(USE_CSM) &&
  defined(CSM_CASCADES)` (CSMShader.js:118, :224, :299). Materials without the define get
  the original behaviour, but the change is process-wide.
- `setupMaterial(material)` **assigns** `material.onBeforeCompile` (CSM.js:443). It does
  not chain an existing hook. Any custom `onBeforeCompile` (for example your fog patch)
  is **overwritten** unless you wrap it:

```js
const fogHook = material.onBeforeCompile;   // your existing fog patch
csm.setupMaterial(material);                 // replaces onBeforeCompile
const csmHook = material.onBeforeCompile;
material.onBeforeCompile = (shader, renderer) => {
  csmHook(shader, renderer);                 // stores shader in csm.shaders, adds CSM uniforms
  fogHook?.(shader, renderer);               // your custom fog
};
```

  Order is up to you. Test that both hooks run, because `csm.shaders.set(material, shader)`
  is what `_updateUniforms()` uses.

- Uniforms added: `CSM_cascades` (breaks), `cameraNear`, `shadowFar`. Cascade selection uses
  `linearDepth = vViewPosition.z / (shadowFar - cameraNear)` (CSMShader.js:121), which is
  **view-space** based, not depth-buffer based. Logarithmic depth does not affect it.
- Fade (`csm.fade = true`) adds `CSM_FADE`. It has to be set before `setupMaterial`.

Compatibility with Lambert/Standard: CSM was written for `MeshStandardMaterial` and
`MeshPhysicalMaterial` light paths (it replaces `lights_fragment_begin`). It works with
`MeshLambertMaterial` through the same chunk, but this is not called out in the source, so
test it.

Sun-light interaction (important for this project): `SunDirectionalLight` and CSM's
cascade lights are both directional light sources. If both are active, the sun is counted
twice. Pick one:

- **Option A**: CSM cascades provide shadows, and their `.color` is set from the
  atmosphere's `getSunLightColor` / `sunLight.color` every frame. Set
  `csm.lights[i].color.copy(sunLight.color)`, and drop `SunDirectionalLight` from the scene
  (keep the transmittance calculation via `getSunLightColor`).
- **Option B**: keep `SunDirectionalLight` for colour and direction, with `castShadow = false`,
  and do not use CSM.

Light direction for CSM is **world space**. Convert the ECEF sun direction with the code in
section 1.

### 5b. GTAO / SSAO / SAO addons

Files in `three/examples/jsm/postprocessing/`: `GTAOPass.js`, `SSAOPass.js`, `SAOPass.js`,
`SSRPass.js`, `SMAAPass.js`, `FXAAPass.js`.

- **`GTAOPass`** (`constructor(scene, camera, width, height, parameters, aoParameters, pdParameters)`)
  is three's own GTAO pass, the successor to SSAO. Facts from the source:
  - Its `Pass` is three's `examples/jsm/postprocessing/Pass.js`. Its method is
    `render(renderer, writeBuffer, readBuffer)` (GTAOPass.js:498). pmndrs' `Pass` is
    `render(renderer, inputBuffer, outputBuffer, ...)`, so the argument order is different.
    Do **not** add it to a pmndrs `EffectComposer` directly. Wrap it, or accept it as a
    self-contained pass.
  - It renders the scene itself (`renderer.render(this.scene, this.camera)` with
    `overrideMaterial`, GTAOPass.js:641-643), so it replaces RenderPass.
  - Depth decode in `GTAOShader.js:114`: `perspectiveDepthToViewZ(depth, cameraNear, cameraFar)`.
    **There is no logarithmic-depth decoding** in the GTAO shader. With
    `logarithmicDepthBuffer: true` you will get wrong AO. Treat as **unsupported** unless
    you patch the shader.
- **`SSAOPass`** and **`SAOPass`** use the same three `Pass` API (`render(renderer, writeBuffer, readBuffer)`,
  SSAOPass.js:282). Not reviewed for logarithmic depth. Assume unsupported.

Recommendation for this project: use **`n8ao`** (section 4), which is written for
the pmndrs `Pass` and has explicit log-depth support. Do not use three's GTAO/SSAO.

---

## 6. postprocessing@6.39.5 built-ins

Constructors checked against `build/types/index.d.ts`.

- **`LUT3DEffect(lut: Texture, { blendFunction?, tetrahedralInterpolation?, inputColorSpace? })`**
  Colour grade with a 3D LUT. Use after tone mapping, or pair it with
  `createHaldLookupTexture` from geospatial-effects to load a Hald PNG. Keep the LUT in
  `SRGBColorSpace` unless you know otherwise.
- **`GodRaysEffect(camera?, lightSource: Mesh|Points, { samples, density, decay, weight, exposure, clampMax, resolutionScale, kernelSize, blur, ... })`**
  Light shafts from a visible light source mesh. The light mesh must be transparent and must not
  write depth. Not an atmosphere-aware shaft: it is screen-space from one light mesh, and it does
  **not** consider the atmosphere's sun transmittance. Sun is far away and the mesh would have to be placed
  on the sun's direction in view space. Probably not worth it on top of AerialPerspective.
- **`DepthOfFieldEffect(camera, { focusDistance (default 3), focusRange (default 2), bokehScale (default 1), resolutionScale (default 0.5), blendFunction, ... })`**
  Bokeh DoF. Uses depth, and sets `LOG_DEPTH` when `renderer.capabilities.logarithmicDepthBuffer`
  (postprocessing.js:5877), with `readDepth` decoding log depth (postprocessing.js:5097). Works with log depth.
  Use `focusDistance` in metres.
- **`SMAAEffect({ preset (default MEDIUM), edgeDetectionMode, ... })`**
  Post AA. The README for n8ao recommends it on top of AO. With composer `multisampling: 4` it is
  redundant for geometry edges but will still help AO halos. Place it last, after tone mapping.
- **`ChromaticAberrationEffect({ blendFunction (NORMAL), offset: Vector2, radialModulation (false), modulationOffset (0.15) })`**
  Lens fringing. Radial modulation is a good match for the lens-flare look.
- **`NoiseEffect({ blendFunction (SCREEN), premultiply (false) })`**
  Film grain. Put it last, before dithering, or skip if you already have dithering.

All of them are `postprocessing` `Effect`s. Put them in an `EffectPass` with the same camera.

---

## 7. Vanilla composer: atmosphere + clouds + n8ao, correct pass order

Pass order, from the sources:

1. `RenderPass(scene, camera)`: lit geometry (Lambert/Standard + SunDirectionalLight + SkyLightProbe, plus sky mesh). Depth written here.
2. `N8AOPostPass`: AO on lit surface radiance, **before** haze. Needs step 1 as input.
3. `EffectPass(camera, cloudsEffect)`: clouds rendered into their own buffer, with AP
   applied to the clouds internally. Needs depth. Also feeds shadows/overlay to step 4.
4. `EffectPass(camera, aerialPerspectiveEffect, toneMapping)`: aerial perspective
   haze plus cloud overlay and shadow composite. Tone mapping in the same pass as the README.
5. Optional: `LUT3DEffect`, `ChromaticAberrationEffect`, `NoiseEffect` and `DitheringEffect`
   (geospatial-effects) after tone mapping, then `SMAAEffect` last if you want it.

Reasoning: AO must modify the lit surface before haze (the sun and sky irradiance are
already in step 1). Clouds must be composited **in** AP so that haze is applied to them. Tone
mapping must be after AP, which is the README order.

```ts
import * as THREE from 'three'
import { EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, HalfFloatType } from 'postprocessing'
import { N8AOPostPass } from 'n8ao'
import {
  AerialPerspectiveEffect,
  PrecomputedTexturesGenerator,
  SkyLightProbe,
  SkyMaterial,
  SunDirectionalLight,
  getSunDirectionECEF
} from '@takram/three-atmosphere'
import { CloudsEffect } from '@takram/three-clouds'
import { DataTextureLoader, Ellipsoid, Geodetic, parseUint8Array } from '@takram/three-geospatial'

const DEG = Math.PI / 180
const renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: true, antialias: false })
// MSAA is done by the composer; the default canvas antialias is off.

const camera = new THREE.PerspectiveCamera(50, w / h, 1, 2e5)  // log depth: far can be large
const scene = new THREE.Scene()

// --- world frame (section 8) ---
const originECEF = new Geodetic(13.1 * DEG, 47.8 * DEG, 0).toECEF()
const east = new THREE.Vector3(), north = new THREE.Vector3(), up = new THREE.Vector3()
Ellipsoid.WGS84.getEastNorthUpVectors(originECEF, east, north, up)
const worldToECEF = new THREE.Matrix4()
  .makeBasis(east, up, north.clone().negate())   // X east, Y up, Z south: check against your frame
  .setPosition(originECEF)

// --- composer ---
const composer = new EffectComposer(renderer, {
  frameBufferType: HalfFloatType,
  multisampling: 4
})
composer.addPass(new RenderPass(scene, camera))

const ao = new N8AOPostPass(scene, camera, w, h)
ao.configuration.aoRadius = 5          // metres; tune to local scene scale
ao.configuration.distanceFalloff = 1.0
ao.configuration.halfRes = true
ao.configuration.gammaCorrection = false  // not the last pass
ao.setQualityMode('Medium')
composer.addPass(ao)

const clouds = new CloudsEffect(camera)
composer.addPass(new EffectPass(camera, clouds))

const aerial = new AerialPerspectiveEffect(camera)   // post-process lighting OFF (sunLight/skyLight default false)
aerial.overlay = clouds.atmosphereOverlay
aerial.shadow = clouds.atmosphereShadow
aerial.shadowLength = clouds.atmosphereShadowLength
clouds.events.addEventListener('change', (event) => {
  switch (event.property) {
    case 'atmosphereOverlay': aerial.overlay = clouds.atmosphereOverlay; break
    case 'atmosphereShadow': aerial.shadow = clouds.atmosphereShadow; break
    case 'atmosphereShadowLength': aerial.shadowLength = clouds.atmosphereShadowLength; break
  }
})
composer.addPass(new EffectPass(camera, aerial, new ToneMappingEffect({ mode: ToneMappingMode.AGX })))

// --- precomputed atmosphere textures (generated; or load the shipped .bin files) ---
const generator = new PrecomputedTexturesGenerator(renderer)
const tex = await generator.update()         // Promise<PrecomputedTextures>
Object.assign(aerial, tex)
clouds.transmittanceTexture = tex.transmittanceTexture
clouds.scatteringTexture = tex.scatteringTexture
clouds.irradianceTexture = tex.irradianceTexture
clouds.singleMieScatteringTexture = tex.singleMieScatteringTexture
clouds.higherOrderScatteringTexture = tex.higherOrderScatteringTexture

// --- cloud textures: self-hosted copies of the package assets ---
clouds.localWeatherTexture = await new THREE.TextureLoader().loadAsync('/clouds/local_weather.png')
clouds.turbulenceTexture = await new THREE.TextureLoader().loadAsync('/clouds/turbulence.png')
clouds.shapeTexture = await new DataTextureLoader(THREE.Data3DTexture, parseUint8Array, {
  width: 128, height: 128, depth: 128, format: THREE.RedFormat,
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, wrapR: THREE.RepeatWrapping,
  colorSpace: THREE.NoColorSpace
}).loadAsync('/clouds/shape.bin')
clouds.shapeDetailTexture = await new DataTextureLoader(THREE.Data3DTexture, parseUint8Array, {
  width: 32, height: 32, depth: 32, format: THREE.RedFormat,
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, wrapR: THREE.RepeatWrapping,
  colorSpace: THREE.NoColorSpace
}).loadAsync('/clouds/shape_detail.bin')
clouds.coverage = 0.4
clouds.qualityPreset = 'medium'

// --- sun + sky for light-source lighting ---
const sunLight = new SunDirectionalLight({ transmittanceTexture: tex.transmittanceTexture })
sunLight.target.position.copy(/* local origin */ new THREE.Vector3())
scene.add(sunLight, sunLight.target)
const skyLight = new SkyLightProbe({ irradianceTexture: tex.irradianceTexture })
scene.add(skyLight)
const skyMaterial = new SkyMaterial()
Object.assign(skyMaterial, tex)
const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMaterial)
skyMesh.frustumCulled = false
scene.add(skyMesh)

const sunECEF = new THREE.Vector3()
function frame(date: Date): void {
  getSunDirectionECEF(date, sunECEF)
  for (const o of [aerial, clouds, sunLight, skyLight]) {
    o.worldToECEFMatrix.copy(worldToECEF)     // getter/readonly: copy into
    o.sunDirection.copy(sunECEF)
  }
  skyMaterial.sunDirection.copy(sunECEF)      // README vanilla example does this; worldToECEF on SkyMaterial not confirmed
  sunLight.update()
  skyLight.update()
  composer.render()
}
```

Caveats in this snippet:

- Variable names `w`, `h` are placeholders for your canvas size.
- `aerial.sunDirection` and `clouds.sunDirection` are getter-only or readonly `Vector3`s
  (types). `copy` into them is the documented way (see R3F example and README vanilla example).
- `clouds.localWeatherRepeat`, `shapeRepeat`, etc. are readonly `Vector2/Vector3` for
  texture tiling; set them with `.set(...)`.
- `SkyMaterial`: the README sets `skyMaterial.sunDirection` (and `moonDirection`) directly.
  The `worldToECEFMatrix` setter on `SkyMaterial` was not checked in the type definitions. Check
  `AtmosphereMaterialBase` (README section "AtmosphereMaterialBase") before relying on it.
- `Object.assign(aerial, tex)` and `Object.assign(skyMaterial, tex)` follow the README.
- `multisampling: 4` on the composer is passed through `frameBufferType`/`multisampling` options
  (EffectComposer constructor, postprocessing.js:1079-1089).
- The AP `sunLight`/`skyLight` flags stay at default `false` (light-source path).

---

## 8. Coordinate system and the local metric world

Problem statement: the world is Web-Mercator-derived, Y up, metres, origin near lat 47.8 N,
lon 13.1 E. Atmosphere and clouds expect **ECEF metres** through `worldToECEFMatrix`.

Requirements from the sources:

1. `worldToECEFMatrix` must be **orthogonal, translation + rotation only, no scale** (README).
   So your world units must already be real metres on the ground.
2. Web Mercator is conformal but not equal-area. Its metres are scaled by `1 / cos(lat)` relative to ground metres.
   At lat 47.8: `cos(47.8°) = 0.6717`, `1/cos = 1.4887`. **If your local coordinates are raw
   Mercator metres, every distance is inflated by ~49 %**, which would break the sun and atmosphere
   scale (horizon, cloud altitudes, shadows).
   Fix: scale horizontal coordinates by `cos(lat)` before rendering (or project to a local ENU
   frame in true metres). This is an input problem, not a matrix problem.
3. The matrix does rotation and translation only. Use
   `Ellipsoid.WGS84.getEastNorthUpVectors(originECEF, east, north, up)` and `makeBasis(...)`
   (section 1 code).
4. Altitude: the origin `Geodetic(lon, lat, height)` height must match your local ground
   height. `correctAltitude` (default `true`) moves the atmosphere's inner sphere to the
   ellipsoid. Keep it on.
5. Logarithmic depth and scale: no effect on the matrix. The far plane can be large
   (`camera.far` 2e5 or more) without losing precision.

Sun direction: `getSunDirectionECEF(date)` returns ECEF. For world-space work (CSM light, your own
shadow light), convert with `ecefToWorld = Matrix3.setFromMatrix4(worldToECEF).transpose()`
(the same operation as `SunDirectionalLight.update()`, SunDirectionalLight.ts:60-66).

---

## 9. Blocking and non-blocking findings

Blocking for the stated design, unless fixed:

1. **Clouds do not shadow lit (Lambert/Standard) objects** in the light-source path.
   Cloud shadows exist only in AerialPerspective's post-process lighting block
   (aerialPerspectiveEffect.frag:102-129). For shadows on your geometry you need the post-process
   path, which requires unlit MeshBasic materials (README). Accept "clouds do not shadow
   geometry" or move the whole scene to post-process lighting. This is a design decision, not a bug.
2. **Mercator scale**: if your local world is raw Web-Mercator metres, the atmosphere is 49 % wrong
   in scale. Must be fixed in the coordinate pipeline (section 8).
3. **Double haze with custom fog**: AerialPerspective applies transmittance and inscatter. Keep your
   custom fog patch only if you disable AP `transmittance`/`inscatter` (or remove the fog patch).
   Otherwise distant objects get haze twice.

Not blocking, but must be handled:

4. **CSM overwrites `material.onBeforeCompile`** (CSM.js:443). Chain your custom fog hook (section 5a).
   CSM also replaces `ShaderChunk.lights_*` globally.
5. **Two sun sources**: `SunDirectionalLight` and CSM cascade lights both light the scene. Use one (section 5a).
6. **GTAO/SSAO from three addons** have a different `Pass` API and no log-depth decoding. Use n8ao.
7. **`setupMaterialsForGeometryPass()`** from geospatial-effects mutates global `ShaderLib`. Avoid unless
   you need the geometry buffer.
8. **Remote default textures**: atmosphere LUTs, cloud textures and STBN all default to GitHub
   `media.githubusercontent.com` URLs in the R3F wrapper. The core classes start with `null` textures.
   Self-host the files from `node_modules/@takram/*/assets/`. `stbn.bin` is not in the npm package.
9. **Sky mesh and log depth**: the sky mesh writes depth through the log formula. Test.

Compatibility confirmed (static): three 0.186.1, postprocessing 6.39.5, takram 0.19.1 / 0.7.6 /
0.9.1 / 0.6.4, n8ao 2.0.1 are inside each other's peer ranges. No peer conflict.

---

## 10. Not verified (needs a browser test)

- Actual rendering with `logarithmicDepthBuffer: true` on a GPU. Log-depth decode is confirmed in source,
  not by output.
- The multisampled depth blit (sample 0 only) with AO and AP at 4x MSAA. Expected small edge artifacts.
- Atmosphere and clouds on `three@0.186.1` specifically. Packages were built against `three >=0.170`,
  so no API break is expected, but not run.
- CSM with `MeshLambertMaterial` plus a custom `onBeforeCompile` fog. Source suggests it works; not tested.
- Runtime cost. The README FPS figures are the author's, not measured here.
- Whether `SkyMaterial` writes log depth that interferes with `AerialPerspectiveEffect`'s
  `depth >= 1.0` sky test.
- Whether `N8AOPostPass` `halfRes` plus log depth needs the explicit `depthBufferType` override.
  The code selects `DepthType.Log` from the renderer capability, so it should be fine.

---

## 11. Recommendation

- Use **three takram packages + n8ao** on the **light-source path** (Lambert/Standard kept). Accept
  that cloud shadows do not reach geometry, or switch the whole scene to post-process lighting later.
- Fix the **Mercator scale** before integrating anything. This is the highest-risk item.
- Drop the **custom fog** when AP is active, or disable AP `transmittance`/`inscatter`.
- Do not use three's GTAO/SSAO or `setupMaterialsForGeometryPass`.
- For shadows, use CSM **or** `SunDirectionalLight` shadows, never both. CSM needs the hook chain.
