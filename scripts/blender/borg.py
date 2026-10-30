# Organic modelling toolkit for the Serpentine rider (exec'd after bhelp.py).
# Shapes are lofted rings with per-vertex anatomical displacement, then smoothed / bevelled with real
# Blender modifiers which are applied (baked) before the GLB export.
import bpy, bmesh, math
from mathutils import Vector, Matrix

TAU = math.tau
T = lambda x, y, z: Vector((x, -z, y))  # three.js rider frame -> Blender


def sgn(x):
    return 1.0 if x >= 0 else -1.0


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a) if b != a else 1.0))
    return t * t * (3 - 2 * t)


def gauss(x, c, w):
    return math.exp(-((x - c) / w) ** 2)


def agauss(phi, c, w):
    """gaussian in angle (wraps around the circle)"""
    d = (phi - c + math.pi) % TAU - math.pi
    return math.exp(-(d / w) ** 2)


def curve(keys, t):
    """C1 cubic Hermite through [(t, value)] keys (finite-difference tangents)."""
    n = len(keys)
    if t <= keys[0][0]:
        return keys[0][1]
    if t >= keys[-1][0]:
        return keys[-1][1]
    i = 0
    while keys[i + 1][0] < t:
        i += 1

    def slope(k):
        a, b = max(k - 1, 0), min(k + 1, n - 1)
        return (keys[b][1] - keys[a][1]) / (keys[b][0] - keys[a][0])

    t0, v0 = keys[i]
    t1, v1 = keys[i + 1]
    h = t1 - t0
    u = (t - t0) / h
    m0, m1 = slope(i) * h, slope(i + 1) * h
    return ((2 * u ** 3 - 3 * u ** 2 + 1) * v0 + (u ** 3 - 2 * u ** 2 + u) * m0 +
            (-2 * u ** 3 + 3 * u ** 2) * v1 + (u ** 3 - u ** 2) * m1)


def loft(bm, y0, y1, prof, M=40, N=32, mod=None, matf=None, caps=(True, True), capmat=(0, 0), phi0=0.0, rnd=(0.0, 0.0), xf=None, ymap=None):
    """Loft rings along three-frame +Y from y0 to y1.
    prof keys (lists of (t, v)): rx, rzf (+z side), rzb (-z side) or rz, cx, cz, n (superellipse exponent).
    mod(t, phi, c, s) -> radial multiplier.  matf(t, phi) -> material index.  Returns the vertex grid."""
    def P(name, t, default):
        k = prof.get(name)
        return curve(k, t) if k else default

    grid = []
    for i in range(M + 1):
        t0 = i / M
        ring = []
        for j in range(N):
            phi = phi0 + TAU * j / N
            c, s = math.cos(phi), math.sin(phi)
            if ymap:
                y = ymap(t0, phi)
                t = (y - y0) / (y1 - y0)
            else:
                t = t0
                y = y0 + (y1 - y0) * t
            rx = P('rx', t, 0.05)
            rz = P('rz', t, rx)
            rzf = P('rzf', t, rz)
            rzb = P('rzb', t, rz)
            cx, cz = P('cx', t, 0.0), P('cz', t, 0.0)
            n = P('n', t, 2.0)
            rf = 1.0
            if rnd[0] and t < rnd[0]:
                rf = math.sqrt(max(0.0, 1 - (1 - t / rnd[0]) ** 2))
            if rnd[1] and t > 1 - rnd[1]:
                rf = math.sqrt(max(0.0, 1 - (1 - (1 - t) / rnd[1]) ** 2))
            rx, rzf, rzb = rx * rf, rzf * rf, rzb * rf
            k = mod(t, phi, c, s) if mod else 1.0
            ex = 2.0 / n
            x = cx + rx * sgn(c) * abs(c) ** ex * k
            z = cz + (rzf if s >= 0 else rzb) * sgn(s) * abs(s) ** ex * k
            p = Vector((x, y, z))
            if xf is not None:
                p = xf @ p
            ring.append(bm.verts.new(T(p.x, p.y, p.z)))
        grid.append(ring)
    for i in range(M):
        for j in range(N):
            j2 = (j + 1) % N
            f = bm.faces.new((grid[i][j], grid[i][j2], grid[i + 1][j2], grid[i + 1][j]))
            if matf:
                f.material_index = matf((i + 0.5) / M, phi0 + TAU * (j + 0.5) / N)
    for end, (on, ring) in enumerate(zip(caps, (grid[0], grid[-1]))):
        if not on:
            continue
        c = Vector((0, 0, 0))
        for v in ring:
            c += v.co
        c /= N
        cv = bm.verts.new(c)
        for j in range(N):
            f = bm.faces.new((ring[j], ring[(j + 1) % N], cv))
            f.material_index = capmat[end]
    return grid


def blob(bm, center, radii, mat=0, rings=10, seg=16, mod=None, theta=(0.0, math.pi), rot=None):
    """Ellipsoid (UV sphere) at `center` (three frame) with radii (rx, ry, rz). Optional radial mod(th, ph)->k."""
    cx, cy, cz = center
    rx, ry, rz = radii
    grid = []
    for k in range(rings + 1):
        th = theta[0] + (theta[1] - theta[0]) * k / rings
        row = []
        for i in range(seg):
            ph = TAU * i / seg
            kk = mod(th, ph) if mod else 1.0
            p = Vector((rx * math.sin(th) * math.cos(ph) * kk, ry * math.cos(th) * kk, rz * math.sin(th) * math.sin(ph) * kk))
            if rot is not None:
                p = rot @ p
            row.append(bm.verts.new(T(cx + p.x, cy + p.y, cz + p.z)))
        grid.append(row)
    for k in range(rings):
        for i in range(seg):
            i2 = (i + 1) % seg
            try:
                f = bm.faces.new((grid[k][i], grid[k][i2], grid[k + 1][i2], grid[k + 1][i]))
            except ValueError:
                continue
            f.material_index = mat
    return grid


def to_obj(bm, name, mats, col, smooth_shade=True):
    me = bpy.data.meshes.new(name)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth_shade
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    return ob


def add_mod(ob, kind, **kw):
    m = ob.modifiers.new(kind.title(), kind)
    for k, v in kw.items():
        setattr(m, k, v)
    return m


def bake(ob):
    """Apply all modifiers (evaluated mesh replaces the object data), keep materials."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def subsurf(ob, level=1, render=None):
    add_mod(ob, 'SUBSURF', levels=level, render_levels=level if render is None else render)


def edge_split(ob, deg=38):
    add_mod(ob, 'EDGE_SPLIT', split_angle=math.radians(deg), use_edge_angle=True, use_edge_sharp=True)


def tris(ob):
    me = ob.data
    return sum(len(p.vertices) - 2 for p in me.polygons)


def tube_bm(bm, a, b, r0, r1=None, seg=10, mat=0, caps=True):
    """Plain tapered tube between two blender-space points."""
    a, b = Vector(a), Vector(b)
    d = b - a
    if d.length < 1e-6:
        return
    z = d.normalized()
    x = z.orthogonal().normalized()
    y = z.cross(x)
    r1 = r0 if r1 is None else r1
    ra, rb = [], []
    for i in range(seg):
        t = TAU * i / seg
        off = x * math.cos(t) + y * math.sin(t)
        ra.append(bm.verts.new(a + off * r0))
        rb.append(bm.verts.new(b + off * r1))
    for i in range(seg):
        j = (i + 1) % seg
        f = bm.faces.new((ra[i], ra[j], rb[j], rb[i]))
        f.material_index = mat
    if caps:
        for ring in (list(reversed(ra)), rb):
            f = bm.faces.new(ring)
            f.material_index = mat


def _foil_pts(K, trunc=0.78):
    """Truncated NACA-like section: list of (chord_pos 0..1 from the leading edge, half-thickness 0..1)."""
    def f(s):
        return (0.2969 * math.sqrt(s) - 0.1260 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1015 * s ** 4) / 0.0782
    up = [trunc * (1 - math.cos(math.pi * k / K)) / 2 for k in range(K + 1)]
    pts = [(s, f(s)) for s in up]
    pts += [(s, -f(s)) for s in reversed(up[1:K + 1])]
    return pts


def spline(pts, per=6):
    """Catmull-Rom samples through control points (Vectors); returns list of (Vector, param 0..1)."""
    pts = [Vector(p) for p in pts]
    if len(pts) == 2:
        out = [(pts[0].lerp(pts[1], i / per), i / per) for i in range(per + 1)]
        return out
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    out = []
    ns = len(pts) - 1
    for s in range(ns):
        p0, p1, p2, p3 = ext[s], ext[s + 1], ext[s + 2], ext[s + 3]
        for i in range(per + (1 if s == ns - 1 else 0)):
            u = i / per
            q = 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
            out.append((q, (s + u) / ns))
    return out


def sweep(bm, pts, sizes, sect='ellipse', n=2.0, N=20, per=6, mat=0, lead=None, side=(1, 0, 0), caps=(True, True),
          rnd=(0.0, 0.0), trunc=0.78, matf=None, mod=None):
    """Sweep a section along a spline through `pts` (three-frame points).  sizes: per control point (u, v) half-extents
    (u across `side`, v along the in-plane chord).  sect: 'ellipse' (superellipse exponent n) or 'foil'."""
    samples = spline([T(*p) if not isinstance(p, Vector) else p for p in pts], per)
    # sizes interpolated linearly along control points
    ncp = len(pts)

    def size_at(u):
        x = u * (ncp - 1)
        i = min(int(x), ncp - 2)
        f = x - i
        a, b = sizes[i], sizes[i + 1]
        return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)

    side_b = T(*side)
    lead_b = T(*lead) if lead else None
    if sect == 'foil':
        K = N // 2
        N = 2 * K
        foil = _foil_pts(K, trunc)
    grid = []
    M = len(samples) - 1
    for idx, (p, u) in enumerate(samples):
        a = samples[max(idx - 1, 0)][0]
        b = samples[min(idx + 1, M)][0]
        tan = (b - a).normalized()
        sd = side_b - tan * side_b.dot(tan)
        if sd.length < 1e-4:
            sd = Vector((0, 1, 0)) - tan * tan.y
        sd.normalize()
        ch = tan.cross(sd).normalized()
        if lead_b is not None and ch.dot(lead_b) < 0:
            ch = -ch
        su, sv = size_at(u)
        rf = 1.0
        t = idx / M
        if rnd[0] and t < rnd[0]:
            rf = math.sqrt(max(0.0, 1 - (1 - t / rnd[0]) ** 2))
        if rnd[1] and t > 1 - rnd[1]:
            rf = math.sqrt(max(0.0, 1 - (1 - (1 - t) / rnd[1]) ** 2))
        ring = []
        for j in range(N):
            if sect == 'foil':
                s, th = foil[j]
                cu, cv = th * su, (1 - 2 * s) * sv
            else:
                ph = TAU * j / N
                c, s_ = math.cos(ph), math.sin(ph)
                ex = 2.0 / n
                cu, cv = su * sgn(c) * abs(c) ** ex, sv * sgn(s_) * abs(s_) ** ex
            k = mod(t, j / N) if mod else 1.0
            ring.append(bm.verts.new(p + (sd * cu + ch * cv) * rf * k))
        grid.append(ring)
    for i in range(M):
        for j in range(N):
            j2 = (j + 1) % N
            f = bm.faces.new((grid[i][j], grid[i][j2], grid[i + 1][j2], grid[i + 1][j]))
            f.material_index = matf((i + 0.5) / M, (j + 0.5) / N) if matf else mat
    for end, (on, ring) in enumerate(zip(caps, (grid[0], grid[-1]))):
        if on:
            c = sum((v.co for v in ring), Vector()) / N
            cv = bm.verts.new(c)
            for j in range(N):
                f = bm.faces.new((ring[j], ring[(j + 1) % N], cv))
                f.material_index = mat
    return grid


def revolve(bm, sec, N=96, mats=0, rmod=None, closed=True):
    """Revolve a section [(x_axial, radius)] around the x axis (wheel axle) at the origin. mats: int or list per edge."""
    ns = len(sec)
    rings = []
    for k in range(N):
        a = TAU * k / N
        ring = []
        for i, (x, r) in enumerate(sec):
            rr = r * (rmod(i, a, x, r) if rmod else 1.0)
            ring.append(bm.verts.new(T(x, math.cos(a) * rr, math.sin(a) * rr)))
        rings.append(ring)
    nedge = ns if closed else ns - 1
    for k in range(N):
        k2 = (k + 1) % N
        for i in range(nedge):
            i2 = (i + 1) % ns
            f = bm.faces.new((rings[k][i], rings[k2][i], rings[k2][i2], rings[k][i2]))
            f.material_index = mats[i] if isinstance(mats, (list, tuple)) else mats
    return rings


def box_bm(bm, c, size, mat=0, rot=None):
    """Axis aligned (three-frame) box; optional rotation Matrix (3x3, three-frame)."""
    cx, cy, cz = c
    sx, sy, sz = (s / 2 for s in size)
    vs = []
    for dz in (-1, 1):
        for dy in (-1, 1):
            for dx in (-1, 1):
                p = Vector((dx * sx, dy * sy, dz * sz))
                if rot is not None:
                    p = rot @ p
                vs.append(bm.verts.new(T(cx + p.x, cy + p.y, cz + p.z)))
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        f = bm.faces.new([vs[i] for i in q])
        f.material_index = mat


def cyl_x(bm, x0, x1, y, z, r, seg=16, mat=0, r1=None):
    tube_bm(bm, T(x0, y, z), T(x1, y, z), r, r1, seg, mat)


def gear(bm, xc, cy, cz, r_root, r_tip, teeth, thick, hub_r, mat=0):
    """Flat toothed ring (sprocket/chainring) with its axis along x, centred at (xc, cy, cz) three-frame."""
    outer, inner = [], []
    for k in range(teeth * 2):
        a = TAU * k / (teeth * 2)
        r = r_tip if k % 2 == 0 else r_root
        for side, lst in ((-1, None), (1, None)):
            pass
        outer.append((a, r))
    verts_f, verts_b, hub_f, hub_b = [], [], [], []
    for a, r in outer:
        for lst, dx in ((verts_f, thick / 2), (verts_b, -thick / 2)):
            lst.append(bm.verts.new(T(xc + dx, cy + math.cos(a) * r, cz + math.sin(a) * r)))
    n = len(outer)
    for lst, dx in ((hub_f, thick / 2), (hub_b, -thick / 2)):
        for k in range(n):
            a = TAU * k / n
            lst.append(bm.verts.new(T(xc + dx, cy + math.cos(a) * hub_r, cz + math.sin(a) * hub_r)))
    for k in range(n):
        k2 = (k + 1) % n
        for quad in ((verts_f[k], verts_b[k], verts_b[k2], verts_f[k2]),        # outer rim
                     (verts_f[k], verts_f[k2], hub_f[k2], hub_f[k]),            # front annulus
                     (verts_b[k2], verts_b[k], hub_b[k], hub_b[k2]),            # back annulus
                     (hub_f[k], hub_f[k2], hub_b[k2], hub_b[k])):               # bore
            f = bm.faces.new(quad)
            f.material_index = mat


def ribbon_on(target, pts, width, offset=0.0012, per=5, nw=3, up_hint=None, mat=0, bm_out=None, pull=0.0):
    """Flat ribbon along a spline through three-frame `pts`, shrink-wrapped onto `target`'s surface (Blender
    shrinkwrap modifier, applied).  Appends geometry to bm_out with material index `mat`."""
    samples = spline([T(*p) for p in pts], per)
    bm2 = bmesh.new()
    rows = []
    for idx, (p, u) in enumerate(samples):
        a = samples[max(idx - 1, 0)][0]
        b = samples[min(idx + 1, len(samples) - 1)][0]
        tan = (b - a).normalized()
        n_out = (p - Vector((0, 0, p.z * 0.6))).normalized()
        sd = tan.cross(n_out)
        if sd.length < 1e-4:
            sd = Vector((1, 0, 0))
        sd.normalize()
        w = width * (up_hint(u) if up_hint else 1.0)
        rows.append([bm2.verts.new(p + sd * w * (k / (nw - 1) - 0.5) * 2 * 0.5) for k in range(nw)])
    for i in range(len(rows) - 1):
        for k in range(nw - 1):
            bm2.faces.new((rows[i][k], rows[i][k + 1], rows[i + 1][k + 1], rows[i + 1][k]))
    me = bpy.data.meshes.new('rib')
    bm2.to_mesh(me)
    bm2.free()
    ob = bpy.data.objects.new('rib', me)
    bpy.context.scene.collection.objects.link(ob)
    m = ob.modifiers.new('sw', 'SHRINKWRAP')
    m.target = target
    m.wrap_method = 'NEAREST_SURFACEPOINT'
    m.offset = offset
    # the offset goes out of the surface: points along the spline lie on chords under a curved target, and nearest-
    # point mode would keep them that far under it, half-hidden
    m.wrap_mode = 'ABOVE_SURFACE'
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    if bm_out is not None:
        bm_out.from_mesh(me2) if False else None
        vmap = [bm_out.verts.new(v.co) for v in me2.vertices]
        for p in me2.polygons:
            f = bm_out.faces.new([vmap[i] for i in p.vertices])
            f.material_index = mat
    bpy.data.meshes.remove(me2)


def merge_into(ob, bm_extra_fn):
    """Re-open ob's mesh as bmesh, let bm_extra_fn(bm) append geometry, write back (keeps materials)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm_extra_fn(bm)
    bm.to_mesh(ob.data)
    bm.free()
    for p in ob.data.polygons:
        p.use_smooth = True


def join_objs(name, objs, mats, col, smooth_shade=True):
    """Merge baked objects that share the same material slot list into one new object."""
    bm = bmesh.new()
    for o in objs:
        bm.from_mesh(o.data)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth_shade
    for o in objs:
        d = o.data
        bpy.data.objects.remove(o)
        bpy.data.meshes.remove(d)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    return ob
