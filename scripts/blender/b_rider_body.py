# Rider body parts (exec'd from b_rider.py).  See the conventions at the top of b_rider.py.
bell = gauss
hp = math.pi / 2


def mk(*mats):
    return bmesh.new(), list(mats)


# ====================================================================== leg (hip → knee → ankle, one skin)
# One mesh from the hip (y = 0) through the knee (y = 0.45) to the ankle (y = 0.92): Rider.ts skins it to a
# thigh and a shin bone (with a half-turned bone at the knee), so the knee bends without the seam two rigid parts
# showed there.
KNEE = 0.45
LEG = 0.92


def thigh_mod(t, phi, c, s):
    sc = 0.45 + 0.55 * smooth(0.58, 0.68, t)      # muscle shows more below the bib-short hem
    k = 1.0
    k += sc * (0.050 * agauss(phi, -0.75, 0.55) * bell(t, 0.45, 0.25)      # vastus lateralis
               + 0.040 * agauss(phi, -1.57, 0.30) * bell(t, 0.40, 0.22)    # rectus femoris
               + 0.075 * agauss(phi, -2.45, 0.32) * bell(t, 0.87, 0.09)    # vastus medialis teardrop
               + 0.035 * agauss(phi, 0.9, 0.5) * bell(t, 0.5, 0.25)        # biceps femoris
               + 0.030 * agauss(phi, 2.3, 0.5) * bell(t, 0.55, 0.25)       # semitendinosus
               - 0.028 * agauss(phi, -1.12, 0.12) * bell(t, 0.5, 0.3))     # groove between VL and RF
    k += 0.055 * agauss(phi, -1.57, 0.26) * bell(t, 0.955, 0.03)             # patella
    k += 0.02 * agauss(phi, math.pi, 0.5) * bell(t, 0.97, 0.03) + 0.02 * agauss(phi, 0, 0.5) * bell(t, 0.97, 0.03)  # condyles
    k += 0.030 * bell(t, 0.63, 0.022) - 0.012 * bell(t, 0.69, 0.02)         # gripper band + skin squeeze
    k += 0.012 * bell(t, 0.57, 0.03) * math.sin(phi * 9 + 1)                # fabric ripples above the hem
    return k


def shin_mod(t, phi, c, s):
    k = 1.0
    k += (0.065 * agauss(phi, 2.3, 0.42) * bell(t, 0.30, 0.13)              # gastrocnemius medial head
          + 0.045 * agauss(phi, 0.85, 0.40) * bell(t, 0.31, 0.12)           # lateral head
          + 0.035 * agauss(phi, 0.3, 0.6) * bell(t, 0.52, 0.14)             # soleus
          - 0.030 * agauss(phi, 1.57, 0.10) * bell(t, 0.30, 0.18)           # calf groove
          + 0.030 * agauss(phi, -0.9, 0.35) * bell(t, 0.34, 0.18)           # tibialis anterior
          + 0.045 * agauss(phi, -1.57, 0.25) * bell(t, 0.5, 0.3)            # tibial crest
          + 0.045 * agauss(phi, -1.57, 0.28) * bell(t, 0.035, 0.03))        # tibial tuberosity / knee
    k += 0.10 * agauss(phi, math.pi, 0.4) * bell(t, 0.965, 0.022) + 0.07 * agauss(phi, 0, 0.4) * bell(t, 0.985, 0.02)  # malleoli
    k += 0.016 * smooth(0.60, 0.64, t) * (1 - smooth(0.64, 0.68, t))          # sock cuff roll
    k -= 0.012 * bell(t, 0.69, 0.02) * (1 if t > 0.62 else 0)
    return k


def joined(y, split, l1, l2, m1, m2, t, phi, c, s, w=0.02):
    """two parts' displacement either side of a joint at `split`, cross-faded over ±w"""
    a = m1(min(1.0, y / l1), phi, c, s)
    b = m2(max(0.0, (y - split) / l2), phi, c, s)
    return a + (b - a) * smooth(split - w, split + w, y)


def keys_at(keys, y0, l, total):
    return [((y0 + t * l) / total, v) for t, v in keys]


if want("leg"):
    bm, ms = mk(shorts, grip, skin, sock, accent)
    SHIN = LEG - KNEE

    def leg_mat(t, phi):
        y = t * LEG
        if y < KNEE:
            u = y / KNEE
            return 0 if u < 0.60 else 1 if u < 0.655 else 2
        u = (y - KNEE) / SHIN
        return 2 if u < 0.62 else 4 if u < 0.665 else 3

    # +z is the back of the leg (hamstring, calf), -z the front (quadriceps, patella, shin)
    loft(bm, 0.0, LEG, dict(
        rx=keys_at([(0, 0.074), (0.1, 0.086), (0.22, 0.090), (0.4, 0.088), (0.7, 0.070), (0.9, 0.056)], 0, KNEE, LEG)
        + keys_at([(0, 0.052), (0.1, 0.053), (0.3, 0.054), (0.5, 0.050), (0.7, 0.040), (0.9, 0.032), (1, 0.030)], KNEE, SHIN, LEG),
        rzf=keys_at([(0, 0.078), (0.12, 0.086), (0.25, 0.088), (0.6, 0.074), (0.9, 0.058)], 0, KNEE, LEG)
        + keys_at([(0, 0.052), (0.15, 0.062), (0.3, 0.070), (0.45, 0.062), (0.65, 0.042), (0.85, 0.033), (1, 0.030)], KNEE, SHIN, LEG),
        rzb=keys_at([(0, 0.072), (0.12, 0.080), (0.25, 0.084), (0.5, 0.078), (0.8, 0.064), (0.95, 0.056)], 0, KNEE, LEG)
        + keys_at([(0, 0.051), (0.2, 0.040), (0.5, 0.036), (0.8, 0.030), (1, 0.028)], KNEE, SHIN, LEG),
        n=[(0, 2.0), (0.6, 2.2), (0.8, 2.4), (1, 2.0)]),
        M=92, N=32, mod=lambda t, phi, c, s: joined(t * LEG, KNEE, KNEE, SHIN, thigh_mod, shin_mod, t, phi, c, s),
        matf=leg_mat, caps=(False, True), rnd=(0.09, 0.0))
    finish(obj("leg", bm, ms), split=50)

# ====================================================================== arm (shoulder → elbow → hand, one skin)
# Shoulder at y = 0, elbow at 0.29, the hand's grip on the hood at 0.58; skinned like the leg.
ELBOW = 0.29
ARM = 0.58


def ua_mod(t, phi, c, s):
    k = 1.0
    k += (0.060 * agauss(phi, -1.57, 0.7) * bell(t, 0.66, 0.2)              # biceps
          + 0.050 * agauss(phi, 1.57, 0.7) * bell(t, 0.58, 0.2)             # triceps
          + 0.045 * agauss(phi, 0.0, 0.8) * bell(t, 0.12, 0.12))            # deltoid
    k += 0.12 * agauss(phi, 1.57, 0.4) * bell(t, 0.975, 0.03)                # olecranon
    k += 0.035 * bell(t, 0.36, 0.03) * (1 - bell(t, 0.43, 0.02)) - 0.02 * bell(t, 0.425, 0.014)   # flared sleeve edge / hem band
    k += 0.010 * math.sin(phi * 7 + t * 14) * (1 - smooth(0.30, 0.40, t)) * smooth(0.1, 0.3, t)  # sleeve wrinkles
    return k


def fa_mod(t, phi, c, s):
    k = 1.0
    k += (0.060 * bell(t, 0.20, 0.20) * (0.6 + 0.4 * math.cos(phi - 1.2))        # muscle belly
          + 0.040 * agauss(phi, 0.3, 0.5) * bell(t, 0.30, 0.2)                    # brachioradialis
          + 0.030 * agauss(phi, -1.57, 0.5) * bell(t, 0.9, 0.1))                  # wrist tendons
    k += 0.02 * agauss(phi, 1.57, 0.4) * bell(t, 0.02, 0.05)                      # elbow
    k += 0.022 * bell(t, 0.83, 0.025) + 0.012 * bell(t, 0.96, 0.02)               # glove cuff + velcro tab
    return k


if want("arm"):
    bm, ms = mk(jersey, accent, skin, glove, glove_palm)
    A_JER, A_ACC, A_SKIN, A_GLOVE, A_PALM = range(5)
    WRIST = ELBOW + 0.24          # the old forearm's elbow → wrist
    dy = ELBOW + 0.145            # old forearm frame (centred, elbow at -0.145) → arm frame
    FORE = WRIST - ELBOW

    def arm_mat(t, phi):
        y = t * WRIST
        if y < ELBOW:
            u = y / ELBOW
            return A_JER if u < 0.385 else A_ACC if u < 0.43 else A_SKIN
        u = (y - ELBOW) / FORE
        return A_SKIN if u < 0.80 else A_PALM if 0.86 < u < 0.90 else A_GLOVE        # (the cuff's tab)

    loft(bm, 0.0, WRIST, dict(
        rx=keys_at([(0, 0.054), (0.15, 0.057), (0.4, 0.052), (0.7, 0.042), (0.95, 0.038)], 0, ELBOW, WRIST)
        + keys_at([(0, 0.039), (0.15, 0.044), (0.45, 0.040), (0.8, 0.031), (1, 0.029)], ELBOW, FORE, WRIST),
        rzf=keys_at([(0, 0.052), (0.35, 0.052), (0.6, 0.046), (0.85, 0.038)], 0, ELBOW, WRIST)
        + keys_at([(0, 0.040), (0.2, 0.042), (0.5, 0.035), (0.85, 0.026), (1, 0.024)], ELBOW, FORE, WRIST),
        rzb=keys_at([(0, 0.052), (0.3, 0.052), (0.55, 0.046), (0.85, 0.040)], 0, ELBOW, WRIST)
        + keys_at([(0, 0.040), (0.2, 0.042), (0.5, 0.035), (0.85, 0.026), (1, 0.024)], ELBOW, FORE, WRIST)),
        M=70, N=28, mod=lambda t, phi, c, s: joined(t * WRIST, ELBOW, ELBOW, FORE, ua_mod, fa_mod, t, phi, c, s, 0.015),
        matf=arm_mat, caps=(False, False), rnd=(0.09, 0.0))

    # glove palm + back of the hand: +z = palm (rests on the hood), -z = back of the hand
    def hand_mod(t, phi, c, s):
        k = 1.0
        k += 0.10 * bell(t, 0.96, 0.05) * agauss(phi, -1.57, 1.0)                      # knuckles
        k += 0.09 * agauss(phi, 2.6, 0.5) * bell(t, 0.25, 0.2)                         # thenar pad (thumb side = -x)
        k += 0.04 * agauss(phi, 1.57, 0.8) * bell(t, 0.6, 0.2)                          # palm pad
        return k

    loft(bm, WRIST - 0.004, 0.205 + dy, dict(
        rx=[(0, 0.029), (0.25, 0.036), (0.65, 0.042), (1, 0.043)],
        rzf=[(0, 0.020), (0.5, 0.017), (1, 0.015)],
        rzb=[(0, 0.022), (0.5, 0.019), (1, 0.017)],
        cz=[(0, 0.004), (1, 0.004)], n=[(0, 2.0), (1, 2.6)]),
        M=14, N=24, mod=hand_mod, matf=lambda t, phi: A_PALM if math.sin(phi) > 0.45 else A_GLOVE, caps=(False, True),
        capmat=(A_GLOVE, A_GLOVE))

    # fingers wrap over the hood: path centres in (y, z) with palm-down = +z; x = across the hand
    fx = (-0.0305, -0.0105, 0.0105, 0.0305)
    fr = (0.0092, 0.0096, 0.0090, 0.0078)
    fl = (1.0, 1.04, 0.98, 0.88)
    base = [(0.192, 0.007), (0.213, 0.008), (0.230, 0.016), (0.238, 0.034), (0.236, 0.053), (0.226, 0.068)]
    for i in range(4):
        pts = []
        for (y, z) in base:
            # shorter fingers stop earlier along the same curl
            pts.append((fx[i] + 0.0015 * (i - 1.5) * ((y - 0.19) / 0.04), y + dy, z))
        keep = 6 if fl[i] >= 1 else 5
        pts = pts[:keep]
        sizes = [(fr[i] * (1.04 if k == 1 else 1.0), fr[i] * (1.04 if k == 1 else 1.0)) for k in range(len(pts))]
        sweep(bm, pts, sizes, sect='ellipse', N=10, per=4, mat=A_SKIN, side=(1, 0, 0), caps=(False, True), rnd=(0, 0.18))
    # thumb: from the thenar pad round the inside of the hood
    tp = [(-0.034, 0.118, 0.004), (-0.045, 0.145, 0.012), (-0.047, 0.172, 0.028), (-0.040, 0.194, 0.044), (-0.031, 0.205, 0.056)]
    sweep(bm, [(x, y + dy, z) for x, y, z in tp], [(0.0105, 0.0105), (0.0100, 0.0100), (0.0092, 0.0092), (0.0088, 0.0088), (0.0082, 0.0082)],
          sect='ellipse', N=10, per=4, mat=A_SKIN, side=(0, 0, 1), caps=(False, True), rnd=(0, 0.18))
    finish(obj("arm", bm, ms), split=50)

# ====================================================================== torso: hips → shoulders, bib shorts + jersey (centred; +Y hip→shoulder, chest +Z)
if want("torso"):
    Y0, Y1 = -0.42, 0.34
    bm, ms = mk(jersey, accent, shorts, grip)
    yk = lambda lst: [((y - Y0) / (Y1 - Y0), v) for y, v in lst]
    RX = yk([(-0.42, 0.115), (-0.36, 0.150), (-0.30, 0.168), (-0.22, 0.165), (-0.12, 0.150), (-0.02, 0.152), (0.06, 0.165),
             (0.14, 0.178), (0.21, 0.186), (0.255, 0.165), (0.285, 0.105), (0.305, 0.066), (0.325, 0.062), (0.34, 0.062)])
    RF = yk([(-0.42, 0.060), (-0.36, 0.082), (-0.30, 0.095), (-0.22, 0.098), (-0.12, 0.095), (-0.02, 0.100), (0.06, 0.110),
             (0.14, 0.108), (0.21, 0.092), (0.255, 0.070), (0.285, 0.056), (0.305, 0.050), (0.34, 0.050)])
    RB = yk([(-0.42, 0.085), (-0.36, 0.105), (-0.30, 0.120), (-0.22, 0.112), (-0.12, 0.103), (-0.02, 0.106), (0.06, 0.112),
             (0.14, 0.118), (0.21, 0.116), (0.255, 0.098), (0.285, 0.072), (0.305, 0.056), (0.34, 0.056)])
    CZ = yk([(-0.42, 0.0), (0.0, 0.0), (0.2, -0.012), (0.3, -0.005), (0.34, 0.0)])
    HEM = lambda s: -0.19 - 0.115 * max(0.0, -s) ** 1.1 + 0.02 * max(0.0, s)

    def torso_mod(t, phi, c, s):
        y = Y0 + (Y1 - Y0) * t
        rx = curve(RX, t)
        x = c * rx
        hem = HEM(s)
        above = smooth(hem - 0.004, hem + 0.012, y)               # 1 above the jersey hem, 0 on the bib shorts
        k = 1.0 + 0.040 * above                                    # loose jersey over skin-tight shorts
        k += 0.014 * bell(y, hem + 0.012, 0.010) * above           # elastic hem lip
        if y < 0.255:
            k += 0.022 * smooth(0.00, 0.14, y) * (1 - smooth(0.2, 0.26, y)) * above * max(0.0, s) * 0.5   # chest fill
        # back: shoulder blades, spine groove, rear pockets
        back = max(0.0, -s)
        k += 0.035 * back * (bell(x, 0.075, 0.05) + bell(x, -0.075, 0.05)) * bell(y, 0.15, 0.06)
        k -= 0.018 * back * bell(x, 0.0, 0.015) * smooth(-0.15, 0.1, y) * (1 - smooth(0.2, 0.26, y))
        for xc in (-0.088, 0.0, 0.088):
            px = 1 - smooth(0.022, 0.046, abs(x - xc))
            py = smooth(-0.225, -0.195, y) * (1 - smooth(-0.085, -0.055, y))
            k += 0.075 * px * py * back * (1.0 - 0.35 * smooth(-0.11, -0.065, y)) * above   # pocket with a sag
        k += 0.018 * bell(y, -0.067, 0.008) * back * (1 - smooth(0.10, 0.14, abs(x))) * above  # pocket elastic band
        # fabric folds at the belly and where the jersey bunches at the hem when tucked forward
        k += 0.007 * max(0.0, s) * math.sin(y * 70 + x * 9) * bell(y, -0.12, 0.07) * above
        k += 0.006 * back * math.sin(y * 60 - x * 11) * bell(y, 0.0, 0.1) * above
        # glutes under the bib shorts, either side of the cleft, rounding off onto the saddle
        k += 0.08 * (1 - above) * back * (bell(x, 0.065, 0.06) + bell(x, -0.065, 0.06)) * bell(y, -0.37, 0.06)
        k -= 0.05 * (1 - above) * back * bell(x, 0.0, 0.016) * (1 - smooth(-0.32, -0.26, y))
        # lower front: bib shorts pelvis / hip crease
        k += -0.03 * (1 - above) * max(0.0, s) * bell(y, -0.30, 0.06)
        # collar roll
        k += 0.10 * bell(y, 0.318, 0.012) + 0.0 * s
        # trapezius
        k += 0.04 * bell(x, 0.07, 0.05) * bell(y, 0.27, 0.025) + 0.04 * bell(x, -0.07, 0.05) * bell(y, 0.27, 0.025)
        return k

    R1, R2, MM = 22, 25, 76     # rows: bib shorts | hem band | jersey

    def torso_y(t0, phi):
        i = t0 * MM
        hem = HEM(math.sin(phi))
        if i <= R1:
            return Y0 + (hem - Y0) * i / R1
        if i <= R2:
            return hem + 0.022 * (i - R1) / (R2 - R1)
        return hem + 0.022 + (Y1 - hem - 0.022) * (i - R2) / (MM - R2)

    def torso_mat(t, phi):
        i = t * MM
        c, s = math.cos(phi), math.sin(phi)
        y = torso_y(t, phi)
        if i < R1:
            return 2
        if i < R2:
            return 1
        if i > MM - 2:
            return 1
        if abs(c) > 0.95 and y < 0.10:
            return 1                                                # side panels
        return 0

    loft(bm, Y0, Y1, dict(rx=RX, rzf=RF, rzb=RB, cz=CZ, n=[(0, 2.2), (1, 2.2)]),
         M=MM, N=60, mod=torso_mod, matf=torso_mat, caps=(True, True), capmat=(2, 0), phi0=-math.pi / 2 + math.pi / 60, ymap=torso_y,
         rnd=(0.07, 0.0))
    o = obj("torso", bm, ms)
    finish(o, split=55)
    # zipper line (dark tape + pull) and bib-strap ridges shrink-wrapped onto the jersey
    zip_pts = [(0.0, 0.31, 0.06), (0.0, 0.2, 0.10), (0.0, 0.05, 0.12), (0.0, -0.08, 0.115), (0.0, -0.13, 0.11)]

    def extras(b):
        ribbon_on(o, zip_pts, 0.0065, 0.0014, per=8, nw=2, mat=2, bm_out=b)
        for sx in (-1, 1):
            pts = [(0.070 * sx, 0.07, 0.12), (0.072 * sx, 0.16, 0.115), (0.074 * sx, 0.24, 0.08), (0.074 * sx, 0.285, 0.0),
                   (0.074 * sx, 0.24, -0.10), (0.072 * sx, 0.15, -0.125), (0.07 * sx, 0.06, -0.12)]
            ribbon_on(o, pts, 0.024, 0.0012, per=8, nw=4, mat=0, bm_out=b)
    merge_into(o, extras)

# ====================================================================== head: face, neck, ears, sunglasses, helmet (origin = head centre, faces +Z)
if want("head"):
    # (helmet_dark again after the trim: the shell's solidify offsets each face's material by one for its inside)
    HM = [skin, lips, hair, helmet, helmet_dark, strap, lens, lens2, rim_black, alu, helmet_trim, helmet_dark]
    SK, LIPS, HAIR, HELM, HDARK, STRAP, LENS, LENS2, LFRAME, ALU, HTRIM = range(11)
    parts = []
    hp = math.pi / 2

    # --- skull + face
    bm = bmesh.new()
    yk = lambda lst: [((y + 0.125) / 0.233, v) for y, v in lst]
    face_rx = yk([(-0.125, 0.026), (-0.112, 0.044), (-0.095, 0.057), (-0.070, 0.066), (-0.040, 0.073), (-0.005, 0.077), (0.03, 0.077),
                  (0.06, 0.071), (0.085, 0.056), (0.100, 0.038), (0.108, 0.030)])
    face_zf = yk([(-0.125, 0.048), (-0.112, 0.080), (-0.095, 0.092), (-0.070, 0.088), (-0.040, 0.091), (-0.005, 0.096), (0.03, 0.093),
                  (0.06, 0.083), (0.085, 0.064), (0.100, 0.042), (0.108, 0.034)])
    face_zb = yk([(-0.125, 0.040), (-0.112, 0.055), (-0.095, 0.062), (-0.070, 0.074), (-0.040, 0.088), (-0.005, 0.098), (0.03, 0.104),
                  (0.06, 0.103), (0.085, 0.090), (0.100, 0.070), (0.108, 0.050)])

    def face_mod(t, phi, c, s):
        y = -0.125 + 0.233 * t
        k = 1.0
        k += 0.050 * agauss(phi, hp, 0.8) * bell(y, 0.030, 0.012)                                       # brow ridge
        k -= 0.075 * (agauss(phi, hp + 0.52, 0.22) + agauss(phi, hp - 0.52, 0.22)) * bell(y, 0.006, 0.014)  # eye sockets
        k += 0.055 * (agauss(phi, hp + 0.95, 0.36) + agauss(phi, hp - 0.95, 0.36)) * bell(y, -0.030, 0.022)  # cheekbones
        k += 0.050 * agauss(phi, hp, 0.30) * bell(y, -0.063, 0.011)                                      # lips
        k -= 0.035 * agauss(phi, hp, 0.30) * bell(y, -0.0745, 0.004)                                     # mouth line
        k += 0.055 * agauss(phi, hp, 0.38) * bell(y, -0.098, 0.016)                                      # chin
        k += 0.040 * (agauss(phi, 0.35, 0.3) + agauss(phi, math.pi - 0.35, 0.3)) * bell(y, -0.072, 0.022)  # jaw angle
        k -= 0.030 * (agauss(phi, hp + 0.45, 0.2) + agauss(phi, hp - 0.45, 0.2)) * bell(y, -0.045, 0.012)    # nasolabial
        return k

    def face_mat(t, phi):
        y = -0.125 + 0.233 * t
        a = abs(((phi - hp + math.pi) % TAU) - math.pi)          # angle from the front
        if -0.0695 < y < -0.0595 and a < 0.19:
            return LIPS
        if y > 0.052 - 0.125 * smooth(0.55, 1.9, a):
            return HAIR
        return SK

    loft(bm, -0.125, 0.108, dict(rx=face_rx, rzf=face_zf, rzb=face_zb, n=[(0, 2.2), (1, 2.2)]),
         M=44, N=40, mod=face_mod, matf=face_mat, caps=(True, False), rnd=(0.0, 0.14), phi0=math.pi / 40)
    # nose: a narrow bridge to a rounded tip, the nostril wings tucked in beside it (two round balls read as a snout)
    sweep(bm, [(0, 0.014, 0.093), (0, -0.008, 0.1035), (0, -0.024, 0.1135)], [(0.0062, 0.0080), (0.0074, 0.0092), (0.0094, 0.0102)],
          sect='ellipse', N=10, per=3, mat=SK, side=(1, 0, 0), caps=(False, True), rnd=(0, 0.3))
    for sx in (-1, 1):
        blob(bm, (0.0088 * sx, -0.0262, 0.1015), (0.0058, 0.0050, 0.0068), SK, rings=5, seg=8)
        # ears
        blob(bm, (0.0755 * sx, -0.012, -0.012), (0.0065, 0.028, 0.020), SK, rings=7, seg=10,
             mod=lambda th, ph: 1 + 0.12 * math.sin(th) * math.cos(ph * 2))
        blob(bm, (0.0745 * sx, -0.040, -0.010), (0.0065, 0.008, 0.009), SK, rings=4, seg=8)      # lobe
        # hair: sideburns + nape
        blob(bm, (0.071 * sx, -0.010, 0.030), (0.0045, 0.020, 0.008), HAIR, rings=5, seg=8)
    blob(bm, (0, -0.050, -0.070), (0.062, 0.050, 0.040), HAIR, rings=8, seg=14)
    # neck: from the skull base down along the torso's up axis into the jersey collar
    ang = math.atan2(-0.764, -0.648)
    xf = Matrix.Translation((0, -0.030, -0.030)) @ Matrix.Rotation(ang, 4, 'X')
    loft(bm, 0.0, 0.27, dict(rx=[(0, 0.046), (0.45, 0.049), (0.8, 0.056), (1, 0.068)],
                              rzf=[(0, 0.050), (0.5, 0.050), (1, 0.058)], rzb=[(0, 0.048), (0.5, 0.050), (1, 0.058)]),
         M=14, N=24, mod=lambda t, phi, c, s: 1 + 0.05 * agauss(phi, -hp, 0.35) * bell(t, 0.35, 0.12) * 1.0
         + 0.05 * (agauss(phi, 0.4, 0.4) + agauss(phi, math.pi - 0.4, 0.4)) * bell(t, 0.7, 0.2),
         matf=lambda t, phi: SK, caps=(False, True), xf=xf)
    o_face = to_obj(bm, "head_face", HM, col)
    parts.append(finish(o_face, split=60))

    # --- sunglasses: wrap shield (solidified), frame rim, temples, nose pads
    bm = bmesh.new()
    NU, NV = 30, 7
    Rx, Rz, z0 = 0.090, 0.110, -0.004
    grid = []
    for iu in range(NU + 1):
        th = -1.28 + 2.56 * iu / NU
        top = 0.034 - 0.008 * (th / 1.28) ** 2
        bot = -0.020 + 0.013 * math.exp(-(th / 0.30) ** 2) + 0.010 * (th / 1.28) ** 2
        col_ = []
        for iv in range(NV + 1):
            v = iv / NV
            y = bot + (top - bot) * v
            col_.append(bm.verts.new(T(Rx * math.sin(th), y, z0 + Rz * math.cos(th) - 0.006 * (1 - v))))
        grid.append(col_)
    for iu in range(NU):
        for iv in range(NV):
            f = bm.faces.new((grid[iu][iv], grid[iu + 1][iv], grid[iu + 1][iv + 1], grid[iu][iv + 1]))
            f.material_index = LENS2 if iv < 2 else LENS
    o_lens = to_obj(bm, "head_lens", HM, col)
    add_mod(o_lens, 'SOLIDIFY', thickness=0.0022, offset=0.0)
    parts.append(finish(o_lens, split=0))
    bm = bmesh.new()
    rim = []
    for iu in range(0, NU + 1, 2):
        th = -1.28 + 2.56 * iu / NU
        rim.append((Rx * 1.003 * math.sin(th), 0.0345 - 0.008 * (th / 1.28) ** 2, z0 + Rz * 1.003 * math.cos(th) - 0.0005))
    sweep(bm, rim, [(0.0030, 0.0030)] * len(rim), sect='ellipse', N=8, per=2, mat=LFRAME, side=(0, 1, 0), caps=(True, True))
    for sx in (-1, 1):
        sweep(bm, [(0.0855 * sx, 0.026, 0.030), (0.0815 * sx, 0.020, -0.010), (0.0800 * sx, 0.008, -0.040), (0.0770 * sx, -0.004, -0.056)],
              [(0.0028, 0.0045)] * 4, sect='ellipse', N=8, per=3, mat=LFRAME, side=(0, 1, 0), caps=(True, True))
        blob(bm, (0.0095 * sx, -0.003, 0.1015), (0.004, 0.009, 0.004), LFRAME, rings=4, seg=6)
    parts.append(finish(to_obj(bm, "head_frame", HM, col), split=60))

    # --- helmet: S-Works Evade 4. A smooth aero shell, long, with a cut-off tail; a wide intake over the brow with
    # two raked slots either side, a long slot down each flank, a port on top of the tail and the exhaust under it,
    # the brow band and the tail's lower lip in the trim colour (red on the White/Red), a red V inside the exhaust
    bm = bmesh.new()
    NH, MH = 72, 22
    cy, ry, rxh, rzf_, rzb_, cz_ = 0.018, 0.100, 0.102, 0.122, 0.190, -0.020

    def edge_y(ph):
        s_ = math.sin(ph)
        return -0.004 + 0.040 * max(s_, 0.0) ** 1.5 - 0.040 * max(-s_, 0.0) ** 1.4

    def shell_pt(ph, u, k=1.0):
        """a point of the shell: ph round the head (front = π/2), u from the crown (0) to the lower edge (1)"""
        ey = edge_y(ph)
        th = math.acos(max(-1.0, min(1.0, (ey - cy) / ry))) * u
        s_, c_ = math.sin(ph), math.cos(ph)
        rz = rzf_ if s_ >= 0 else rzb_
        back = max(0.0, -s_)
        # a ridge along the crown; behind, the shell stays full up high, so the top runs level back past the ears
        # to a tail that narrows and is cut off square
        kk = 1 + 0.02 * agauss(ph, hp, 0.25) * math.sin(th)
        sw = math.sin(th) ** (1 - 0.4 * back)
        x = rxh * sw * c_ * kk * (1 - 0.13 * back ** 2)
        z = rz * sw * s_ * kk
        if z < -0.15:
            z = -0.15 - 0.025 * math.tanh((-z - 0.15) / 0.025)
        y = cy + ry * math.cos(th) * (1 + 0.02 * math.sin(th))
        return Vector((x * k, cy + (y - cy) * k, cz_ + z * k))

    def front_angle(j):
        return abs(((TAU * (j + 0.5) / NH - hp + math.pi) % TAU) - math.pi)     # 0 at the front, π behind

    def is_vent(j, i):
        a, u = front_angle(j), (i + 0.5) / MH
        if a < 0.40 and 0.78 < u < 0.92:
            return True                                                          # brow intake
        if a > math.pi - 0.48 and 0.68 < u < 0.92:
            return True                                                          # exhaust
        if a > math.pi - 0.20 and 0.32 < u < 0.50:
            return True                                                          # port on top of the tail
        return False

    def shell_mat(j, i):
        a, u = front_angle(j), (i + 0.5) / MH
        if u > 0.91 and (a < 0.62 or a > math.pi - 0.55):
            return HTRIM
        return HELM

    hg = [[bm.verts.new(T(*shell_pt(TAU * j / NH, i / MH))) for i in range(MH + 1)] for j in range(NH)]
    for j in range(NH):
        j2 = (j + 1) % NH
        for i in range(MH):
            if is_vent(j, i):
                continue
            bm.faces.new((hg[j][i], hg[j2][i], hg[j2][i + 1], hg[j][i + 1])).material_index = shell_mat(j, i)
    o_helm = to_obj(bm, "head_helm", HM, col)
    add_mod(o_helm, 'SOLIDIFY', thickness=0.011, offset=-1.0, use_rim=True, material_offset=1, material_offset_rim=1)
    parts.append(finish(o_helm, split=55))
    # the dark liner seen through the vents, and the exhaust's red V
    bm = bmesh.new()
    # the raked slots beside the intake and the long one down each flank are curves across the cells, so they are
    # drawn onto the shell (cut out of it, they came out as stairs)
    taper = lambda u: 0.35 + 0.65 * math.sin(math.pi * u) ** 0.6
    for sx in (-1, 1):
        ph = lambda a: hp - sx * a
        for a0, rake, w in ((0.53, 0.55, 0.012), (0.83, 0.5, 0.011)):
            pts = [tuple(shell_pt(ph(a0 + rake * (0.90 - u)), u)) for u in (0.50, 0.60, 0.70, 0.80, 0.90)]
            ribbon_on(o_helm, pts, w, offset=0.0008, per=6, nw=3, up_hint=taper, mat=HDARK, bm_out=bm)
        pts = [tuple(shell_pt(ph(a), 0.75 - 0.09 * (a - 1.12))) for a in (1.10, 1.35, 1.6, 1.85, 2.1, 2.3)]
        ribbon_on(o_helm, pts, 0.017, offset=0.0008, per=6, nw=3, up_hint=taper, mat=HDARK, bm_out=bm)
    NL, ML = 36, 11
    lg = [[bm.verts.new(T(*shell_pt(TAU * j / NL, 0.97 * i / ML, 0.86))) for i in range(ML + 1)] for j in range(NL)]
    for j in range(NL):
        for i in range(ML):
            bm.faces.new((lg[j][i], lg[(j + 1) % NL][i], lg[(j + 1) % NL][i + 1], lg[j][i + 1])).material_index = HDARK
    # the intake and the top port are shallow: a dark floor 4 mm in (through them the liner left the forehead showing)
    for j in range(NH):
        for i in range(MH):
            a, u = front_angle(j), (i + 0.5) / MH
            if is_vent(j, i) and a < math.pi - 0.48:
                q = [bm.verts.new(T(*shell_pt(TAU * jj / NH, ii / MH, 0.965))) for jj, ii in ((j, i), (j + 1, i), (j + 1, i + 1), (j, i + 1))]
                bm.faces.new(q).material_index = HDARK
    for sx in (-1, 1):
        ph0 = -hp + sx * 0.40
        # (out to the tail's cut face, where it shows from the side as a red fin)
        v = [shell_pt(ph0, 0.70, 0.99), shell_pt(-hp + sx * 0.2, 0.80, 0.98), shell_pt(-hp, 0.90, 0.97)]
        sweep(bm, [tuple(p) for p in v], [(0.0055, 0.0055)] * 3, sect='ellipse', N=8, per=4, mat=HTRIM, side=(0, 1, 0), caps=(True, True))
    o_lin = to_obj(bm, "head_liner", HM, col)
    # (open strips and an open dome: face them all away from the head, which the normal recalculation can't tell)
    c0 = T(0, cy, cz_)
    b2 = bmesh.new()
    b2.from_mesh(o_lin.data)
    for f in b2.faces:
        if f.normal.dot(f.calc_center_median() - c0) < 0:
            f.normal_flip()
    b2.to_mesh(o_lin.data)
    b2.free()
    parts.append(finish(o_lin, split=55))
    # retention cradle (dark band round the back of the skull), dial, chin straps and buckle
    bm = bmesh.new()
    cradle = [(-0.081, 0.002, -0.020), (-0.078, -0.022, -0.065), (-0.050, -0.044, -0.100), (0.0, -0.050, -0.108), (0.050, -0.044, -0.100),
              (0.078, -0.022, -0.065), (0.081, 0.002, -0.020)]
    sweep(bm, cradle, [(0.0075, 0.0028)] * len(cradle), sect='ellipse', N=8, per=5, mat=STRAP, side=(0, 1, 0), caps=(True, True), n=2.6)
    for sx in (-1, 1):
        sweep(bm, [(0.040 * sx, -0.048, -0.100), (0.052 * sx, -0.005, -0.116), (0.050 * sx, 0.040, -0.110)], [(0.005, 0.0025)] * 3, sect='ellipse',
              N=8, per=4, mat=STRAP, side=(1, 0, 0), caps=(True, True))
    tube_bm(bm, T(0, -0.052, -0.1065), T(0, -0.052, -0.119), 0.0125, 0.0115, 14, HDARK)
    tube_bm(bm, T(0, -0.052, -0.119), T(0, -0.052, -0.1215), 0.0105, 0.0105, 14, ALU)
    for sx in (-1, 1):
        sweep(bm, [(0.090 * sx, -0.003, 0.026), (0.083 * sx, -0.040, 0.020), (0.072 * sx, -0.088, 0.026), (0.052 * sx, -0.120, 0.046), (0.020 * sx, -0.126, 0.064)],
              [(0.0058, 0.0013)] * 5, sect='ellipse', N=8, per=5, mat=STRAP, side=(0, 0, 1), caps=(True, True), n=3.0)
        sweep(bm, [(0.088 * sx, -0.004, -0.050), (0.080 * sx, -0.040, -0.044), (0.068 * sx, -0.085, -0.010), (0.064 * sx, -0.100, 0.020)],
              [(0.0055, 0.0013)] * 4, sect='ellipse', N=8, per=5, mat=STRAP, side=(0, 0, 1), caps=(True, True), n=3.0)
        box_bm(bm, (0.011 * sx, -0.127, 0.066), (0.012, 0.008, 0.014), ALU)
    parts.append(finish(to_obj(bm, "head_straps", HM, col), split=55))
    obj_h = join_objs("head", parts, HM, col)
    objs["head"] = obj_h

# ====================================================================== road shoe (origin at the cleat; sole at y≈-0.015, toe +Z, lateral +X)
if want("shoe"):
    SM = [shoe, shoe_dark, sole, alu, steel, accent]
    S_W, S_D, S_SOLE, S_ALU, S_STEEL, S_ACC = range(6)
    Z0, Z1 = -0.115, 0.157
    zk = lambda lst: [((z - Z0) / (Z1 - Z0), v) for z, v in lst]
    SX = [(-0.113, 0.0), (-0.100, 0.026), (-0.085, 0.032), (-0.065, 0.034), (-0.040, 0.035), (-0.015, 0.037), (0.010, 0.041), (0.040, 0.046),
          (0.070, 0.048), (0.100, 0.045), (0.130, 0.036), (0.150, 0.022), (0.157, 0.0)]
    SH = [(-0.113, 0.020), (-0.100, 0.060), (-0.085, 0.088), (-0.065, 0.093), (-0.040, 0.090), (-0.015, 0.077), (0.010, 0.062), (0.040, 0.050),
          (0.070, 0.044), (0.100, 0.040), (0.130, 0.034), (0.150, 0.026), (0.157, 0.020)]
    SOLE_TOP = -0.0045
    xf = Matrix.Rotation(math.pi / 2, 4, 'X')
    top_y = lambda z: SOLE_TOP + curve(zk(SH), (z - Z0) / (Z1 - Z0))
    bm = bmesh.new()

    def up_mod(t, phi, c, s):
        z = Z0 + (Z1 - Z0) * t
        k = 1.0
        k += 0.030 * bell(z, 0.0, 0.03) * agauss(phi, -hp, 0.5)           # tongue / instep bulge
        k -= 0.012 * (bell(z, 0.055, 0.012) + bell(z, -0.005, 0.012)) * agauss(phi, -hp, 0.5)   # dial pads
        k += 0.03 * bell(z, -0.05, 0.02) * (agauss(phi, 0, 0.3) + agauss(phi, math.pi, 0.3))     # ankle bones
        return k

    def up_mat(t, phi):
        z = Z0 + (Z1 - Z0) * t
        s, c = math.sin(phi), math.cos(phi)
        if z > 0.125:
            return S_D                                                     # toe bumper
        if z < -0.075 and s > -0.5:
            return S_D                                                     # heel counter
        if z < -0.03 and s < -0.85:
            return S_D                                                     # collar padding
        if abs(c) > 0.93 and -0.02 < z < 0.11:
            return S_ACC                                                   # side stripe (kit accent)
        return S_W

    loft(bm, Z0, Z1, dict(rx=zk(SX), rzb=[(t, h) for t, h in zk([(z, h + 0.0045) for z, h in SH])], rzf=[(0, 0.004), (1, 0.004)],
                          cz=[(0, 0.0045), (1, 0.0045)], n=[(0, 2.4), (1, 2.4)]),
         M=38, N=26, mod=up_mod, matf=up_mat, caps=(False, False), rnd=(0.05, 0.05), xf=xf)
    # carbon sole with a heel pad
    sx_sole = [(t, v + 0.003) for t, v in zk(SX)]
    loft(bm, Z0 + 0.001, Z1 - 0.001, dict(rx=sx_sole, rz=[(0, 0.0058), (1, 0.0058)], cz=[(0, 0.010), (1, 0.010)], n=[(0, 3.2), (1, 3.2)]),
         M=30, N=18, matf=lambda t, phi: S_D if t < 0.08 else S_SOLE, caps=(False, False), rnd=(0.05, 0.05), xf=xf)
    # cleat (3-bolt road style) + bolts
    box_bm(bm, (0, -0.0192, 0.002), (0.042, 0.0072, 0.060), S_D)
    box_bm(bm, (0, -0.0192, -0.030), (0.034, 0.0072, 0.016), S_D)
    for bx, bz in ((0.0, 0.026), (-0.013, -0.012), (0.013, -0.012)):
        tube_bm(bm, T(bx, -0.0226, bz), T(bx, -0.0215, bz), 0.0042, 0.0042, 8, S_ALU)
    # collar ring round the shin
    ring = [(0.037 * math.cos(a), 0.0905, -0.057 + 0.036 * math.sin(a)) for a in [TAU * k / 14 for k in range(15)]]
    sweep(bm, ring[:-1] + [ring[0]], [(0.0065, 0.0065)] * 15, sect='ellipse', N=8, per=2, mat=S_D, side=(0, 1, 0), caps=(False, False))
    # BOA dials (lateral-biased on the instep) with a tilt following the instep slope, plus cable zig-zag
    for zd in (0.056, 0.001):
        yd = top_y(zd)
        dz = (top_y(zd + 0.01) - top_y(zd - 0.01)) / 0.02
        n = Vector((0, 1, -dz)).normalized()
        base = Vector((0.010, yd, zd))
        # build axis in blender space
        a0 = T(*(base + n * 0.0005))
        nb = T(*n) - T(0, 0, 0)
        tube_bm(bm, a0, a0 + nb * 0.004, 0.0135, 0.0125, 18, S_D)
        tube_bm(bm, a0 + nb * 0.004, a0 + nb * 0.0095, 0.0122, 0.0115, 18, S_ALU)
        tube_bm(bm, a0 + nb * 0.0095, a0 + nb * 0.0105, 0.0090, 0.0085, 14, S_D)
    for zc in (0.075, 0.052, 0.030, 0.008, -0.014, -0.034):
        for sx in (-1, 1):
            p0 = (0.0305 * sx, top_y(zc) * 0.55 + 0.002, zc)
            p1 = (0.010 * sx * 0.3 + 0.010, top_y(zc + 0.012) + 0.0015, zc + 0.012)
            tube_bm(bm, T(*p0), T(*p1), 0.0011, 0.0011, 5, S_STEEL, caps=True)
    o = obj("shoe", bm, SM)
    finish(o, split=45)
