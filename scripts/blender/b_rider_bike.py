# Bike parts (exec'd from b_rider.py): frame + cockpit + drivetrain ("bike"), "wheel", "crank".
# Pivots are unchanged: bike at the origin, wheel at its axle (rotates about X), crank at the bottom bracket.
FR, BK, AL, BO, CB, ST, DC = range(7)
BMATS = [frame, black, alu, bottle, carbon, steel, decal]
rear, front = (0, WHEEL_R, -0.5), (0, WHEEL_R, 0.5)
seat_top, head_top, head_bot = (0, 0.79, -0.245), (0, 0.86, 0.38), (0, 0.72, 0.42)
V = lambda *a: Vector(a)

if want("bike"):
    bm = bmesh.new()
    # ---- frame: truncated aerofoil down tube + seat tube, round-ish top tube, tapered head tube
    sweep(bm, [(0, 0.292, -0.070), (0, 0.50, 0.150), (0, 0.712, 0.402)], [(0.0165, 0.044), (0.0165, 0.044), (0.0150, 0.034)],
          sect='foil', N=24, per=8, mat=FR, lead=(0, -0.5, 1), side=(1, 0, 0), caps=(False, False), trunc=0.80)
    sweep(bm, [(0, 0.285, -0.098), (0, 0.55, -0.178), (0, 0.80, -0.250)], [(0.0135, 0.027), (0.0135, 0.026), (0.0125, 0.024)],
          sect='foil', N=24, per=8, mat=FR, lead=(0, 0, 1), side=(1, 0, 0), caps=(False, True), trunc=0.80)
    sweep(bm, [(0, 0.775, -0.243), (0, 0.84, 0.0), (0, 0.852, 0.372)], [(0.0150, 0.0145), (0.0160, 0.0135), (0.0170, 0.0165)],
          sect='ellipse', n=2.6, N=22, per=8, mat=FR, side=(1, 0, 0), caps=(False, False))
    sweep(bm, [(0, 0.716, 0.4215), (0, 0.790, 0.4015), (0, 0.862, 0.3815)], [(0.0270, 0.0270), (0.0230, 0.0235), (0.0195, 0.0195)],
          sect='ellipse', n=2.2, N=22, per=5, mat=FR, side=(1, 0, 0), caps=(True, True))
    cyl_x(bm, -0.044, 0.044, BB[1], BB[2], 0.0215, 24, FR)                                  # bottom bracket shell
    cyl_x(bm, -0.052, -0.044, BB[1], BB[2], 0.0165, 20, AL)
    cyl_x(bm, 0.044, 0.052, BB[1], BB[2], 0.0165, 20, AL)
    for s in (-1, 1):
        # seat stays (dropped, joining low on the seat tube) and chain stays
        sweep(bm, [(0.018 * s, 0.705, -0.228), (0.040 * s, 0.52, -0.37), (0.062 * s, 0.345, -0.497)],
              [(0.0075, 0.0125), (0.0070, 0.0115), (0.0060, 0.0105)], sect='ellipse', n=2.4, N=14, per=7, mat=FR, side=(1, 0, 0), caps=(False, False))
        sweep(bm, [(0.028 * s, 0.272, -0.115), (0.050 * s, 0.30, -0.30), (0.062 * s, 0.338, -0.497)],
              [(0.0090, 0.0160), (0.0075, 0.0130), (0.0060, 0.0105)], sect='ellipse', n=2.4, N=14, per=7, mat=FR, side=(1, 0, 0), caps=(False, False))
        # fork blades (aero, raked) with dropouts
        sweep(bm, [(0.050 * s, 0.700, 0.428), (0.0565 * s, 0.52, 0.466), (0.062 * s, 0.345, 0.500)],
              [(0.0070, 0.020), (0.0062, 0.0185), (0.0055, 0.0150)], sect='foil', N=16, per=7, mat=FR, lead=(0, 0, 1), side=(1, 0, 0),
              caps=(False, True), trunc=0.78)
        box_bm(bm, (0.0665 * s, 0.34, -0.50), (0.007, 0.042, 0.026), BK)                    # rear dropout
        box_bm(bm, (0.0665 * s, 0.34, 0.50), (0.007, 0.040, 0.026), BK)                     # fork dropout
        cyl_x(bm, 0.0625 * s, 0.074 * s, 0.34, -0.50, 0.0075, 10, AL)
        cyl_x(bm, 0.0625 * s, 0.074 * s, 0.34, 0.50, 0.0075, 10, AL)
    cyl_x(bm, -0.052, 0.052, 0.700, 0.428, 0.0185, 20, FR)                                  # fork crown
    # ---- steerer stack, integrated cockpit (aero stem + wing) and bars
    tube_bm(bm, T(0, 0.866, 0.379), T(0, 0.898, 0.3715), 0.0215, 0.0215, 22, CB)           # spacers
    tube_bm(bm, T(0, 0.898, 0.3715), T(0, 0.904, 0.370), 0.0180, 0.0160, 18, AL)           # top cap
    sweep(bm, [(0, 0.880, 0.373), (0, 0.900, 0.420), (0, 0.904, 0.462)], [(0.0225, 0.0235), (0.0215, 0.0200), (0.0225, 0.0175)],
          sect='ellipse', n=2.6, N=22, per=5, mat=CB, side=(1, 0, 0), caps=(True, False))
    sweep(bm, [(-0.080, 0.903, 0.470), (0.0, 0.903, 0.471), (0.080, 0.903, 0.470)], [(0.0080, 0.0165), (0.0080, 0.0175), (0.0080, 0.0165)],
          sect='ellipse', n=2.8, N=20, per=6, mat=CB, side=(0, 1, 0), caps=(True, True))     # aero wing top
    box_bm(bm, (0, 0.903, 0.4835), (0.052, 0.036, 0.004), CB)                              # faceplate
    for bx in (-0.019, 0.019):
        for by in (-0.012, 0.012):
            tube_bm(bm, T(bx, 0.903 + by, 0.486), T(bx, 0.903 + by, 0.4875), 0.0026, 0.0026, 8, AL)
    for s in (-1, 1):
        bar = [(0.078 * s, 0.903, 0.470), (0.150 * s, 0.9015, 0.470), (0.200 * s, 0.900, 0.474), (0.205 * s, 0.901, 0.512),
               (0.205 * s, 0.890, 0.548), (0.205 * s, 0.852, 0.573), (0.205 * s, 0.806, 0.562), (0.205 * s, 0.776, 0.527),
               (0.205 * s, 0.769, 0.470), (0.205 * s, 0.770, 0.405)]
        sweep(bm, bar, [(0.0115, 0.0115)] * len(bar), sect='ellipse', N=14, per=5, mat=CB, side=(1, 0, 0), caps=(False, True),
              matf=lambda t, u: CB if t < 0.22 else BK)
        # brake hood body (rubber) + lever blade
        hood = [(0.2 * s, 0.905, 0.492), (0.2 * s, 0.922, 0.540), (0.2 * s, 0.934, 0.572), (0.2 * s, 0.930, 0.596)]
        sweep(bm, hood, [(0.0170, 0.016), (0.0200, 0.026), (0.0195, 0.0285), (0.0150, 0.0235)], sect='ellipse', n=2.4, N=16, per=6, mat=BK,
              side=(1, 0, 0), caps=(False, True), rnd=(0, 0.25))
        lever = [(0.2 * s, 0.915, 0.600), (0.2 * s, 0.888, 0.613), (0.2 * s, 0.846, 0.623), (0.2 * s, 0.805, 0.620)]
        sweep(bm, lever, [(0.0050, 0.011)] * 4, sect='ellipse', n=2.6, N=10, per=5, mat=CB, side=(1, 0, 0), caps=(True, True))
        box_bm(bm, (0.2 * s, 0.943, 0.560), (0.006, 0.004, 0.030), AL)                     # shifter paddle / button
    # ---- seatpost, saddle with shaped rails
    sweep(bm, [(0, 0.795, -0.246), (0, 0.87, -0.265), (0, 0.945, -0.283)], [(0.0115, 0.0215), (0.0115, 0.0205), (0.0115, 0.0195)],
          sect='foil', N=18, per=6, mat=CB, lead=(0, 0, 1), side=(1, 0, 0), caps=(False, True), trunc=0.8)
    box_bm(bm, (0, 0.942, -0.285), (0.044, 0.016, 0.052), CB)
    # a short-nosed saddle (24 cm): a longer tail came out through the rider's seat
    SZ0, SZ1 = -0.406, -0.165
    szk = lambda lst: [((z - SZ0) / (SZ1 - SZ0), v) for z, v in lst]
    # loft along Z (xf maps local +Y → +Z; local +z points down): flipped so the nose is at SZ1
    sx = szk([(-0.406, 0.0), (-0.396, 0.050), (-0.374, 0.068), (-0.34, 0.063), (-0.30, 0.046), (-0.25, 0.031), (-0.20, 0.019), (-0.17, 0.012), (-0.165, 0.0)])
    cyv = szk([(-0.406, 0.979), (-0.38, 0.977), (-0.30, 0.973), (-0.2, 0.972), (-0.165, 0.973)])
    cz_local = [(t, -v) for t, v in cyv]
    xf = Matrix.Rotation(math.pi / 2, 4, 'X')
    loft(bm, SZ0, SZ1, dict(rx=sx, rz=[(0, 0.0125), (0.5, 0.0120), (1, 0.0105)], cz=cz_local, n=[(0, 3.0), (1, 3.0)]), M=26, N=22,
         mod=lambda t, phi, c, s: 1 - 0.14 * agauss(phi, -hp, 0.30) * smooth(0.25, 0.5, t) - 0.05 * agauss(phi, hp, 0.4),
         matf=lambda t, phi: BK, caps=(False, False), rnd=(0.04, 0.05), xf=xf)
    for s in (-1, 1):
        rail = [(0.011 * s, 0.960, -0.190), (0.016 * s, 0.951, -0.245), (0.027 * s, 0.947, -0.300), (0.045 * s, 0.953, -0.360), (0.050 * s, 0.961, -0.385)]
        sweep(bm, rail, [(0.0036, 0.0030)] * 5, sect='ellipse', N=8, per=6, mat=CB, side=(1, 0, 0), caps=(True, True))
    # ---- bottle + cage on the down tube
    dt = V(0, 0.663, 0.748)
    nrm = V(0, 0.748, -0.663)
    ctr = V(0, 0.292, -0.070) + V(0, 0.42, 0.472) * 0.45 + nrm * 0.059
    ex = V(1, 0, 0)
    ez = ex.cross(dt)
    xfb = Matrix.Translation(ctr) @ Matrix((ex, dt, ez)).transposed().to_4x4()
    BL = 0.215
    bk = [(0.0, 0.026), (0.03, 0.033), (0.12, 0.0345), (0.62, 0.0345), (0.78, 0.0335), (0.88, 0.0245), (0.93, 0.0150), (1.0, 0.0140)]
    loft(bm, -BL / 2, BL / 2, dict(rx=bk, rz=bk), M=26, N=22, matf=lambda t, phi: DC if 0.34 < t < 0.52 else BK if t > 0.92 else BO,
         caps=(True, True), capmat=(BO, BK), rnd=(0.08, 0.0), xf=xfb)
    tube_bm(bm, T(*(xfb @ V(0, 0.101, 0))), T(*(xfb @ V(0, 0.111, 0))), 0.0105, 0.0090, 14, BK)  # nozzle
    for yl in (-0.060, 0.030):
        arc = [xfb @ V(0.0372 * math.cos(a), yl, 0.0372 * math.sin(a)) for a in [math.radians(a_) for a_ in range(-120, 121, 30)]]
        sweep(bm, arc, [(0.0022, 0.0022)] * len(arc), sect='ellipse', N=6, per=2, mat=CB, side=(1, 0, 0), caps=(True, True))
    for a in (-120, 120):
        pa = [xfb @ V(0.0372 * math.cos(math.radians(a)), yl, 0.0372 * math.sin(math.radians(a))) for yl in (-0.085, 0.045)]
        sweep(bm, pa, [(0.0022, 0.0022)] * 2, sect='ellipse', N=6, per=2, mat=CB, side=(1, 0, 0), caps=(True, True))
    # ---- cassette (11 cogs) + freehub, rear derailleur, chain
    cogs = (11, 12, 13, 14, 15, 17, 19, 21, 24, 28)[::-1]
    for k, tc in enumerate(cogs):
        rr = tc * 0.00202
        gear(bm, 0.043 + k * 0.0036, rear[1], rear[2], rr - 0.0022, rr + 0.0018, max(tc // 2 + 3, 8), 0.0018, 0.0130, ST if k < 3 else AL)
    cyl_x(bm, 0.036, 0.082, rear[1], rear[2], 0.0155, 20, BK)
    cyl_x(bm, 0.076, 0.082, rear[1], rear[2], 0.0165, 20, AL)
    # derailleur: hanger, parallelogram, cage with two jockey wheels
    box_bm(bm, (0.0715, 0.318, -0.513), (0.010, 0.040, 0.022), CB)
    box_bm(bm, (0.0745, 0.283, -0.507), (0.016, 0.040, 0.026), CB)
    cyl_x(bm, 0.066, 0.083, 0.2745, -0.507, 0.0055, 12, AL)
    for x_ in (0.0685, 0.0815):
        sweep(bm, [(x_, 0.274, -0.507), (x_, 0.248, -0.502), (x_, 0.222, -0.4885)], [(0.0020, 0.0070)] * 3, sect='ellipse', N=8, per=3, mat=BK, side=(1, 0, 0), caps=(True, True))
    gear(bm, 0.075, 0.2745, -0.507, 0.0085, 0.0105, 11, 0.003, 0.004, AL)
    gear(bm, 0.075, 0.2215, -0.4885, 0.0085, 0.0105, 11, 0.003, 0.004, AL)
    # front derailleur (small box on the seat tube) and cables
    box_bm(bm, (0.012, 0.382, -0.116), (0.030, 0.030, 0.032), CB)
    # chain: links resampled along a closed path (y,z) at the big-ring/17T chain line
    C1, R1 = (BB[1], BB[2]), 0.1066
    C2, R2 = (rear[1], rear[2]), 17 * 0.00202
    du = Vector((C2[0] - C1[0], C2[1] - C1[1]))
    dd = du.length
    u_ = du / dd
    pr = Vector((-u_.y, u_.x))
    cs = (R1 - R2) / dd
    nup = u_ * cs + pr * math.sqrt(1 - cs * cs)
    if nup.x < 0:
        nup = u_ * cs - pr * math.sqrt(1 - cs * cs)
    ndn = u_ * cs - pr * math.sqrt(1 - cs * cs) if (u_ * cs + pr * math.sqrt(1 - cs * cs)).x > 0 else u_ * cs + pr * math.sqrt(1 - cs * cs)
    path = []
    p_up1 = Vector(C1) + nup * R1
    p_up2 = Vector(C2) + nup * R2
    path += [p_up1, p_up2]
    a0 = math.atan2(nup.y, nup.x)  # angle in the (y, z) plane measured from +y toward +z
    # arc over the rear of the cog: from nup direction round the back (decreasing angle through -z) to the bottom
    for a in [a0 + (math.pi * 1.0 + 0.45) * k / 10 for k in range(1, 11)]:
        path.append(Vector(C2) + Vector((math.cos(a), math.sin(a))) * R2)
    # down through the cage (S-shape) and back to the lower tangent of the chainring
    path += [Vector((0.2900, -0.5040)), Vector((0.2745, -0.5000)), Vector((0.2400, -0.4960)), Vector((0.2215, -0.4960)), Vector((0.2125, -0.4900)),
             Vector((0.2125, -0.4700))]
    low = Vector(C1) + ndn * R1
    path += [low + (Vector((0.2125, -0.47)) - low) * 0.0, low]
    # arc around the chainring from the lower tangent forward round the front back up to the upper tangent
    a1 = math.atan2(ndn.y, ndn.x)
    a2 = math.atan2(nup.y, nup.x)
    da = (a2 - a1) % TAU
    for k in range(1, 22):
        a = a1 - ((TAU - da)) * k / 22      # sweep through the front (+z)
        path.append(Vector(C1) + Vector((math.cos(a), math.sin(a))) * R1)
    path.append(p_up1)
    # resample at 12.7 mm
    cum = [0.0]
    for i in range(1, len(path)):
        cum.append(cum[-1] + (path[i] - path[i - 1]).length)
    total = cum[-1]
    nl = int(total / 0.0127)
    for li in range(nl):
        d = li * total / nl
        j = max(1, next(i for i in range(len(cum)) if cum[i] >= d)) if d > 0 else 1
        pa_, pb_ = path[j - 1], path[j]
        f = (d - cum[j - 1]) / max(cum[j] - cum[j - 1], 1e-6)
        pp = pa_.lerp(pb_, f)
        tg = (pb_ - pa_).normalized()
        w_ = 0.0058 if li % 2 == 0 else 0.0042
        # link box: local z along the chain tangent in the (y, z) plane
        R = Matrix(((1, 0, 0), (0, -tg.y, tg.x), (0, tg.x, tg.y)))
        box_bm(bm, (0.0595, pp.x, pp.y), (w_, 0.0048, 0.0112), ST if li % 2 else AL, rot=R)
    # ---- disc brake calipers (left side) and brake mount
    for (cy, cz) in ((0.352, -0.426), (0.352, 0.426)):
        box_bm(bm, (-0.044, cy, cz), (0.031, 0.040, 0.028), CB)
        box_bm(bm, (-0.044, cy, cz + (0.012 if cz > 0 else -0.012)), (0.036, 0.012, 0.010), BK)
        tube_bm(bm, T(-0.062, cy - 0.01, cz), T(-0.027, cy - 0.01, cz), 0.0042, 0.0042, 8, AL)
    box_bm(bm, (-0.058, 0.338, -0.426), (0.008, 0.030, 0.030), BK)
    box_bm(bm, (-0.058, 0.338, 0.426), (0.008, 0.030, 0.030), BK)
    o = obj("bike", bm, BMATS)
    finish(o, split=45)

# ====================================================================== wheel (origin = axle; deep carbon rim, tubeless tyre, disc rotor)
if want("wheel"):
    WM = [tyre, carbon, alu, tan, decal, black, steel]
    bm = bmesh.new()
    # tyre: 29 mm section with gum sidewalls, shallow chevron tread
    NS = 16
    sec = []
    for i in range(NS):
        ps = TAU * i / NS
        c, s = math.cos(ps), math.sin(ps)
        sec.append((0.0145 * sgn(c) * abs(c) ** (2 / 2.4), 0.3265 + 0.0135 * sgn(s) * abs(s) ** (2 / 2.4)))
    tm = [(WM.index(tyre) if sec[i][1] > 0.3300 and sec[(i + 1) % NS][1] > 0.3300 else WM.index(tan)) for i in range(NS)]

    def tread(i, a, x, r):
        if r > 0.334:
            return 1 - 0.0018 * (0.5 + 0.5 * math.cos(a * 36 + abs(x) * 260)) - 0.0020 * bell(x, 0, 0.0016)
        return 1.0
    revolve(bm, sec, N=144, mats=tm, rmod=tread)
    # rim: 50 mm deep carbon section with a brand-free decal band
    rim = [(-0.0105, 0.3135), (0.0105, 0.3135), (0.0138, 0.3085), (0.0146, 0.2980), (0.0144, 0.2915), (0.0141, 0.2870), (0.0134, 0.2790),
           (0.0105, 0.2680), (-0.0105, 0.2680), (-0.0134, 0.2790), (-0.0141, 0.2870), (-0.0144, 0.2915), (-0.0146, 0.2980), (-0.0138, 0.3085)]
    rmats = [1] * len(rim)
    rmats[4] = 4
    rmats[10] = 4
    revolve(bm, rim, N=96, mats=rmats)
    # hub, flanges, lockring
    cyl_x(bm, -0.032, 0.034, 0, 0, 0.0165, 22, 2)
    cyl_x(bm, -0.030, -0.0245, 0, 0, 0.0235, 22, 2)
    cyl_x(bm, 0.0275, 0.0330, 0, 0, 0.0235, 22, 2)
    cyl_x(bm, -0.074, 0.074, 0, 0, 0.0075, 12, 6)
    cyl_x(bm, -0.0405, -0.0345, 0, 0, 0.0185, 20, 2)
    # disc rotor (left): 160 mm, scalloped edge, carrier + bolts
    gear(bm, -0.0445, 0, 0, 0.0788, 0.0800, 36, 0.0018, 0.0500, 6)
    gear(bm, -0.0445, 0, 0, 0.0498, 0.0500, 6, 0.0030, 0.0300, 2)
    for k in range(6):
        a = TAU * k / 6
        cyl_x(bm, -0.0475, -0.0420, math.cos(a) * 0.0385, math.sin(a) * 0.0385, 0.0030, 8, 6)
    # 24 bladed spokes, tangentially laced
    for k in range(24):
        left = k % 2 == 0
        a = TAU * k / 24
        fx = -0.0275 if left else 0.030
        fa = a + (0.55 if (k // 2) % 2 == 0 else -0.55)
        p0 = T(fx, math.cos(fa) * 0.0235, math.sin(fa) * 0.0235)
        p1 = T(-0.0085 if left else 0.0085, math.cos(a) * 0.2685, math.sin(a) * 0.2685)
        tube_bm(bm, p0, p1, 0.0011, 0.0011, 4, 5)
    # valve stem
    tube_bm(bm, T(0, 0.2686, 0), T(0, 0.2380, 0), 0.0030, 0.0030, 8, 2)
    o = obj("wheel", bm, WM)
    finish(o, split=45)

# ====================================================================== crankset (origin = bottom bracket, rotates about X)
if want("crank"):
    CM = [carbon, alu, steel, black, decal]
    bm = bmesh.new()
    # spindle
    cyl_x(bm, -0.082, 0.064, 0, 0, 0.0115, 18, 2)
    for s in (-1, 1):
        # hollow-looking carbon arm, tapering to the pedal eye
        sweep(bm, [(0.070 * s, 0.0, 0.0), (0.070 * s, 0.09 * s, 0.0), (0.070 * s, 0.1725 * s, 0.0)], [(0.0075, 0.0215), (0.0068, 0.0170), (0.0062, 0.0125)],
              sect='ellipse', n=3.0, N=16, per=8, mat=0, side=(1, 0, 0), caps=(True, True))
        cyl_x(bm, 0.0755 * s, 0.080 * s, 0.0, 0.0, 0.0200, 18, 1)                            # crank bolt cap area
        cyl_x(bm, 0.0755 * s, 0.153 * s, 0.1725 * s, 0.0, 0.0050, 10, 2)                       # pedal spindle
        box_bm(bm, (0.120 * s, 0.1725 * s, 0.0), (0.060, 0.021, 0.090), 3)                   # pedal body
        box_bm(bm, (0.120 * s, 0.1725 * s + 0.0105 * 1, 0.0), (0.056, 0.003, 0.052), 2)     # cleat platform
        box_bm(bm, (0.152 * s, 0.1725 * s, 0.0), (0.005, 0.016, 0.030), 1)
    # power-meter spider on the drive side (4 arms) + housing, big 53T and small 39T rings with teeth
    cyl_x(bm, 0.0530, 0.0580, 0, 0, 0.0400, 28, 0)
    box_bm(bm, (0.0592, 0.0, 0.0300), (0.0020, 0.012, 0.006), 4)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        sweep(bm, [(0.0585, math.cos(a) * 0.030, math.sin(a) * 0.030), (0.0585, math.cos(a) * 0.060, math.sin(a) * 0.060),
                   (0.0585, math.cos(a) * 0.092, math.sin(a) * 0.092)], [(0.0030, 0.0085), (0.0028, 0.0070), (0.0026, 0.0060)],
              sect='ellipse', n=2.6, N=10, per=4, mat=0, side=(1, 0, 0), caps=(True, True))
        cyl_x(bm, 0.0575, 0.0640, math.cos(a + 0.35) * 0.0850, math.sin(a + 0.35) * 0.0850, 0.0035, 8, 2)   # chainring bolts
    gear(bm, 0.0620, 0, 0, 0.1025, 0.1075, 53, 0.0024, 0.0840, 1)
    gear(bm, 0.0535, 0, 0, 0.0758, 0.0800, 39, 0.0024, 0.0600, 2)
    o = obj("crank", bm, CM)
    finish(o, split=45)
