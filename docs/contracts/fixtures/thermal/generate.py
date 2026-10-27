"""Reference cases for the dough thermal model of docs/contracts/fermentation.md (#176).

Computed outside the engine (no import from packages/): closed forms of the contract's
equations, with the constants of the contract's thermal table. The exact first eigenvalue of the
sphere (bisection on 1 - mu cot mu = Bi) is used only to cross-check the contract's
tau_eff = tau_lumped (1 + Bi_R/(p+2)) against the GPT fixtures of the #176 collation.

Run: python3 -I generate.py > cases.json   (in this directory)
"""
import json
import math

R = 8.314462618
A_K, K_K, EA = 3.43, 0.729, 98300.0  # kinetic law, unchanged (fermentation.md)
TREF = 294.25
H = 3600.0

# --- thermal constants (fermentation.md, "Dough thermal model") ---
CP = 2800.0
POR = {"unproofed": (1100.0, 0.38), "mid": (750.0, 0.28), "proofed": (400.0, 0.18)}
H_EXT = {"fridgeStatic": 8.0, "fridgeStaticMetal": 5.0, "fridgeVentilated": 12.0,
         "roomStill": 9.0, "provingBox": 10.0}
G_SHELF = {"fridgeStatic": 0.025, "fridgeVentilated": 0.025}
WALL = {"glass": 0.004, "plastic": 0.008, "ceramic": 0.006, "steel": 6.9e-5, "aluminium": 1e-5,
        "banneton": 0.063}
LINER = 0.02
COVER = {"lid": 0.14, "film": 0.07, "cloth": 0.04, "none": 0.0}
SHEET_T = 0.006
DT_AD = 0.85


def geometry(cls, m, rho):
    v = m / rho  # m in kg, rho in kg/m3
    if cls == "bulk":
        r = (3 * v / (2 * math.pi)) ** (1 / 3)
        return dict(p=3, v=v, aw=2 * math.pi * r * r, at=math.pi * r * r)
    if cls == "ball":
        r = (3 * v / (4 * math.pi)) ** (1 / 3)
        return dict(p=3, v=v, aw=2 * math.pi * r * r, at=2 * math.pi * r * r)
    if cls == "tin":
        a = (v / 2) ** (1 / 3)
        return dict(p=2, v=v, aw=8 * a * a, at=2 * a * a)
    if cls == "sheet":
        return dict(p=1, v=v, aw=v / SHEET_T, at=v / SHEET_T)
    raise ValueError(cls)


def tau(m, cls, material, cover, env, porosity, liner=False, cont_g=None, cont_c=0.0,
        h=None, gs=None, r_cover=None, cp=CP, rwall=None, k=None):
    m = m / 1000.0  # grams in, kilograms inside
    rho, kk = POR[porosity]
    kk = k or kk
    g = geometry(cls, m, rho)
    he = h if h is not None else H_EXT["fridgeStaticMetal" if (env == "fridgeStatic" and material in ("steel", "aluminium")) else env]
    rw = rwall if rwall is not None else WALL[material] + (LINER if liner and material == "banneton" else 0)
    rc = r_cover if r_cover is not None else COVER[cover]
    uw = 1 / (rw + 1 / he)
    ut = 1 / (rc + 1 / he)
    gsh = gs if gs is not None else G_SHELF.get(env, 0.0)
    ua = uw * g["aw"] + ut * g["at"] + gsh
    area = g["aw"] + g["at"]
    ueff = ua / area
    r0 = g["p"] * g["v"] / area
    bi = ueff * r0 / kk
    cc = cont_c
    tl = (m * cp + cc) / ua
    te = tl * (1 + bi / (g["p"] + 2))
    gam = (1 + bi / 2) / (1 + bi / (g["p"] + 2))
    return dict(ua=ua, area=area, ueff=ueff, r0=r0, bi=bi, tau_lumped_h=tl / H, tau_eff_h=te / H,
                gamma_core=gam, v=g["v"], aw=g["aw"], at=g["at"])


def mean(t0, tinf, t_h, tau_h):
    return tinf + (t0 - tinf) * math.exp(-t_h / tau_h)


def core(t0, tinf, tbar, gam):
    c = tinf + gam * (tbar - tinf)
    lo, hi = sorted((t0, tinf))
    return min(max(c, lo), hi)


def rate(T, d=1.0):
    return (d ** K_K) / A_K * math.exp((EA / R) * (1 / TREF - 1 / (T + 273.15)))


def mu1(bi):
    lo, hi = 1e-9, math.pi - 1e-9
    f = lambda mu: 1 - mu / math.tan(mu) - bi
    for _ in range(200):
        mid = (lo + hi) / 2
        if f(mid) > 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def gpt(m, h=3.5, rho=1100.0, cp=2700.0, k=0.40):
    m = m / 1000.0
    v = m / rho
    r = (3 * v / (4 * math.pi)) ** (1 / 3)
    bi = h * r / k
    tl = m * cp / (h * 4 * math.pi * r * r) / H
    m1 = mu1(bi)
    tau1 = r * r / (k / (rho * cp) * m1 * m1) / H
    return dict(r=r, bi=bi, tau_lumped_h=tl, tau_eff_contract_h=tl * (1 + bi / 5), mu1=m1, tau1_h=tau1)


def guggenheim(t1, t2, t3, dt):
    tau_ = dt / math.log((t1 - t2) / (t2 - t3))
    tinf = (t1 * t3 - t2 * t2) / (t1 - 2 * t2 + t3)
    return tau_, tinf


def two_point(t1, T1, t2, T2, tamb):
    return (t2 - t1) / math.log((T1 - tamb) / (T2 - tamb))


def selfheat(tau_h, dt_ad, d, tamb, t_h):
    s = dt_ad * rate(tamb, d)
    beta = EA / (R * (tamb + 273.15) ** 2)
    psi = beta * tau_h * s
    unc = s * tau_h * (1 - math.exp(-t_h / tau_h))
    out = dict(S_K_per_h=s, beta=beta, psi=psi, x_inf_unc=s * tau_h, x_t_unc=unc)
    if psi < 1:
        tc = tau_h / (1 - psi)
        out.update(tau_coupled_h=tc, x_inf_cpl=s * tc, x_t_cpl=s * tc * (1 - math.exp(-t_h / tc)))
    return out


def rnd(x, n=4):
    return round(x, n)


BAND = {"h": {"fridgeStatic": (4.0, 10.0), "roomStill": (6.0, 12.0)}, "gs": (0.0, 0.25), "rc": (0.04, 0.39), "cp": (2700.0, 2930.0)}


def band(m, cls, material, cover, env, porosity):
    """Min and max tau_eff over every corner of the thermal ranges (contract band rule)."""
    vals = []
    for h in BAND["h"][env]:
        for gs in (BAND["gs"] if env in G_SHELF else (0.0,)):
            for rc in ((BAND["rc"] if cover == "lid" else (COVER[cover],))):
                for cp in BAND["cp"]:
                    vals.append(tau(m, cls, material, cover, env, porosity, h=h, gs=gs, r_cover=rc, cp=cp)["tau_eff_h"])
    return min(vals), max(vals)


def path_progress(start_c, segs, upper, n=20000):
    """Progress F over fixed segments (hours, ambient, tau_lo, tau_hi), central kinetics, 1 % fresh.

    The lag of each instant is chosen inside its step's band: the upper path keeps the dough as warm
    as the band allows (tau_hi while cooling, tau_lo while warming), the lower path the reverse.
    Without self-heating the dough never crosses the ambient within a step, so the choice is made
    once per step and the temperature is a closed-form exponential. F is integrated by Simpson's
    rule on n intervals per step.
    """
    t0, f = start_c, 0.0
    for hours, amb, lo, hi in segs:
        cooling = t0 > amb
        tau_h = (hi if cooling else lo) if upper else (lo if cooling else hi)
        temp = (lambda t: amb) if tau_h == 0 else (lambda t, a=amb, s=t0, c=tau_h: a + (s - a) * math.exp(-t / c))
        dt = hours / n
        acc = rate(temp(0)) + rate(temp(hours))
        for i in range(1, n):
            acc += (4 if i % 2 else 2) * rate(temp(i * dt))
        f += acc * dt / 3
        t0 = temp(hours)
    return f


def path_fixed(start_c, segs, pick):
    """Same as path_progress with one tau per step given by pick(index, lo, hi)."""
    return path_progress(start_c, [(h, a, pick(i, lo, hi), pick(i, lo, hi)) for i, (h, a, lo, hi) in enumerate(segs)], True)


def fx(name, inp, exp, tol, note):
    return dict(name=name, input=inp, expected=exp, tolerance=tol, note=note)


def main():
    cases = []
    T0, TF = 24.0, 4.0
    # (a), (b) fridge transitions
    for nm, m, cls, mat, cover, env, ts in (
        ("a: 250 g ball, lidded plastic box, static fridge", 250, "ball", "plastic", "lid", "fridgeStatic", (1.0, 2.0)),
        ("b: 2 kg bulk, lidded glass bowl, static fridge", 2000, "bulk", "glass", "lid", "fridgeStatic", (2.0, 4.0)),
    ):
        x = tau(m, cls, mat, cover, env, "unproofed")
        lo, hi = band(m, cls, mat, cover, env, "unproofed")
        pts = {}
        for t in ts:
            mb = mean(T0, TF, t, x["tau_eff_h"])
            pts["meanC@%gh" % t] = rnd(mb, 3)
            pts["coreC@%gh" % t] = rnd(core(T0, TF, mb, x["gamma_core"]), 3)
        exp = {k_: rnd(x[k_], 5) for k_ in ("ua", "ueff", "r0", "bi", "tau_lumped_h", "tau_eff_h", "gamma_core")}
        exp.update({"v_m3": rnd(x["v"], 8), "aw_m2": rnd(x["aw"], 6), "at_m2": rnd(x["at"], 6)})
        exp.update(pts)
        exp["tauBandH"] = [rnd(lo, 3), rnd(hi, 3)]
        cases.append(fx(nm, dict(massG=m, thermal=dict(geometry=cls, container=dict(material=mat, cover=cover), environment=env, porosity="unproofed"),
                                 startC=T0, ambientC=TF, evaluatedAtHours=list(ts)), exp,
                        dict(hours=0.005, temperatureC=0.01, ratio=0.001),
                        "Isolated cooling (dT_ad 0). Constants of fermentation.md (cp 2800, rho 1100, k 0.38, h 8, glass 0.004, plastic 0.008, lid 0.14, shelf 0.025 W/K). Mean: single exponential; core: gamma_core, clamped between the start and ambient temperatures. tauBandH: min and max over the corners of h 4-10, shelf 0-0.25 W/K, lid 0.04-0.39, cp 2700-2930."))
    # cross-check with GPT A, B, D (collation): same inputs, direct h, exact eigenvalue
    g = {k_: gpt(m_) for k_, m_ in (("A", 250), ("B", 2000), ("D", 500))}
    cases.append(fx("cross-check: GPT A, B, D of the #176 collation (not contract inputs)",
                    dict(note="sphere, h 3.5 W/m2K only, rho 1100, cp 2700, k 0.40, no container; first-order closure on the exact first eigenvalue"),
                    {k_: dict(Bi=rnd(v_["bi"], 5), tauLumpedH=rnd(v_["tau_lumped_h"], 4), tauContractH=rnd(v_["tau_eff_contract_h"], 4),
                              tauExactH=rnd(v_["tau1_h"], 4),
                              mean2hC=rnd(mean(24, 4, 2.0, v_["tau1_h"]), 3), mean2hContractC=rnd(mean(24, 4, 2.0, v_["tau_eff_contract_h"]), 3))
                     for k_, v_ in g.items()},
                    dict(tauH=0.001, temperatureC=0.001),
                    "Reproduces the collation (tau1 3.1771, 6.7799, 4.0713 h; 14.657, 18.891, 16.237 C at 2 h). The contract's 1 + Bi/5 closure stays within 0.7 % of the exact tau1 here."))
    # (c) self heating, 2 kg, 24 C, room, 1 % fresh
    c = tau(2000, "bulk", "glass", "lid", "roomStill", "unproofed")
    sh = {lab: selfheat(c["tau_eff_h"], v, 1.0, 24.0, 2.0) for lab, v in (("low0.6", 0.6), ("central0.85", DT_AD), ("high1.2", 1.2))}
    cases.append(fx("c: 2 kg self-heating at 24 C, lidded glass bowl, still room, 1 % fresh yeast",
                    dict(massG=2000, thermal=dict(geometry="bulk", container=dict(material="glass", cover="lid"), environment="roomStill", porosity="unproofed"),
                         ambientC=24.0, startC=24.0, freshDosePct=1.0),
                    dict(tauEffH=rnd(c["tau_eff_h"], 5), rate24PerH=rnd(rate(24.0), 6), betaPerK=rnd(sh["central0.85"]["beta"], 6),
                         **{lab: {k_: rnd(v_, 4) for k_, v_ in d_.items()} for lab, d_ in sh.items()}),
                    dict(temperatureC=0.005, hours=0.005),
                    "Uncoupled: x(t) = S tau (1 - e^-t/tau), S = dT_ad rate(T_amb). Coupled-linearised: beta = Ea/(R T_amb^2), psi = beta S tau, tau_c = tau/(1 - psi), x(t) = S tau_c (1 - e^-t/tau_c). x_t_* at 2 h, excess over ambient in K."))
    # collation cross-check of the coupled closed form with Argon's F3 inputs
    s0, tau_a, beta_a = 0.4925, 3.5198, 68000 / (R * 297.15 ** 2)
    psi_a = beta_a * s0 * tau_a
    tc_a = tau_a / (1 - psi_a)
    cases.append(fx("cross-check: Argon F3 of the #176 collation (not contract inputs)",
                    dict(S0KPerH=s0, tauH=tau_a, EaJPerMol=68000, ambientC=24.0, hours=2.0),
                    dict(psi=rnd(psi_a, 4), xInfUncoupledK=rnd(s0 * tau_a, 4), xInfCoupledK=rnd(s0 * tc_a, 4), tauCoupledH=rnd(tc_a, 4),
                         meanAt2hC=rnd(24 + s0 * tc_a * (1 - math.exp(-2 / tc_a)), 3)),
                    dict(temperatureC=0.01), "Reproduces Argon F3: psi 0.1605, 1.7336 K, 2.0651 K, 4.1931 h, 24.78 C."))
    # (d) calibration
    tm = tau(500, "bulk", "glass", "lid", "fridgeStatic", "unproofed")["tau_eff_h"]
    ta, tinf = guggenheim(19.20, 12.20, 8.42, 1.5)
    tp = two_point(1.0, 19.20, 4.0, 8.42, 4.0)
    tau_true, tinf_true = 2.5, 5.0
    syn = [round(tinf_true + (24 - tinf_true) * math.exp(-t / tau_true), 4) for t in (1.0, 2.5, 4.0)]
    ta2, tinf2 = guggenheim(*syn, 1.5)
    cases.append(fx("d: calibration, 500 g bulk, lidded glass bowl, static fridge",
                    dict(key=dict(material="glass", cover="lid", environment="fridgeStatic"), tauModelH=rnd(tm, 5),
                         readings_argon=[dict(tH=1.0, C=19.20), dict(tH=2.5, C=12.20), dict(tH=4.0, C=8.42)],
                         readings_exact=[dict(tH=t, C=v) for t, v in zip((1.0, 2.5, 4.0), syn)], ambientC=4.0, startC=24.0),
                    dict(guggenheimArgon=dict(tauH=rnd(ta, 4), tInfC=rnd(tinf, 3), factor=rnd(ta / tm, 4)),
                         twoPointArgonKnownAmbient4C=dict(tauH=rnd(tp, 4), factor=rnd(tp / tm, 4)),
                         guggenheimExact=dict(tauH=rnd(ta2, 4), tInfC=rnd(tinf2, 3), factor=rnd(ta2 / tm, 4)),
                         exactInputs=dict(tauH=tau_true, tInfC=tinf_true)),
                    dict(tauH=0.002, temperatureC=0.01),
                    "Two-point estimator: the first (1 h) and the last (4 h) reading, T_amb 4 C. Argon F4 readings (1, 2.5, 4 h: 19.20, 12.20, 8.42) give tau 2.434 h and T_inf 3.98 C as in the collation; its factor 1.176 used Argon's tau_eff 2.07 h, here the factor divides by the contract's own tau_eff of this case. The exact readings are generated from tau 2.5 h, T_inf 5 C and rounded to 4 decimals."))
    # (e) legacy
    leg = {"tau0.0h": TF, "tau1.5h": mean(24, 4, 1.0, 1.5), "tau3.0h": mean(24, 4, 1.0, 3.0)}
    cases.append(fx("e: step without thermal inputs keeps tau 1.5 h, band 0-3 h",
                    dict(thermal=None, startC=24.0, ambientC=4.0, hours=1.0),
                    dict(meanAt1hC=rnd(leg["tau1.5h"], 4), bandAt1hC=[rnd(leg["tau0.0h"], 4), rnd(leg["tau3.0h"], 4)],
                         tauCentralH=1.5, tauBandH=[0.0, 3.0]),
                    dict(temperatureC=0.001),
                    "Today's behaviour (fermentation.md, Dough temperature). Every case of fermentation/cases.json has no thermal input and stays valid unchanged."))
    # (f) out of domain
    f = tau(3000, "bulk", "glass", "lid", "roomStill", "unproofed")
    sf = selfheat(f["tau_eff_h"], DT_AD, 2.0, 30.0, 2.0)
    sf_ok = selfheat(c["tau_eff_h"], DT_AD, 1.0, 24.0, 2.0)
    cases.append(fx("f: self-heating unbounded, 3 kg bulk at 30 C, 2 % fresh yeast",
                    dict(massG=3000, thermal=dict(geometry="bulk", container=dict(material="glass", cover="lid"), environment="roomStill", porosity="unproofed"),
                         ambientC=30.0, freshDosePct=2.0),
                    dict(tauEffH=rnd(f["tau_eff_h"], 4), rate30PerH=rnd(rate(30.0, 2.0), 5), SKPerH=rnd(sf["S_K_per_h"], 4),
                         betaPerK=rnd(sf["beta"], 5), psi=rnd(sf["psi"], 4), limit=rnd(1 / math.e, 5),
                         status="out_of_domain", reason="self_heating_unbounded",
                         contrastPsiCaseC=rnd(sf_ok["psi"], 4)),
                    dict(psi=0.0005),
                    "psi > 1/e: no equilibrium exists for the linearised coupling, the forecast is not integrated. Case c has psi 0.155 and is in domain."))
    # (g) mixed path, default lag band: shared corners understate the envelope
    segs_g = [(2.0, 4.0, 0.0, 3.0), (2.0, 24.0, 0.0, 3.0)]
    shared = [path_fixed(24.0, segs_g, lambda i, lo, hi, v=v: v) for v in (0.0, 3.0)]
    cases.append(fx("g: default lag band on a mixed path, 2 h fridge then 2 h room, 1 % fresh",
                    dict(thermal=None, startC=24.0, freshDosePct=1.0,
                         steps=[dict(hours=2.0, ambientC=4.0), dict(hours=2.0, ambientC=24.0)]),
                    dict(progressCentral=rnd(path_fixed(24.0, segs_g, lambda i, lo, hi: 1.5), 5),
                         progressBand=[rnd(path_progress(24.0, segs_g, False), 5), rnd(path_progress(24.0, segs_g, True), 5)],
                         sharedCornersBandWrong=[rnd(min(shared), 5), rnd(max(shared), 5)]),
                    dict(progress=0.0005),
                    "Progress F (not percent) at the end of the path, central kinetic parameters. A high lag speeds fermentation while the dough cools and slows it while it warms, so the band is the per-instant envelope (upper path: lag 3 h in the fridge, 0 h at room; lower path the reverse), not the two shared corners tau 0 and tau 3 h for the whole path, which give the narrower sharedCornersBandWrong and must not be returned."))
    # (h) container change and room return, thermal bands
    bulk = band(2000, "bulk", "glass", "lid", "fridgeStatic", "unproofed")
    balls = band(250, "ball", "plastic", "lid", "fridgeStatic", "mid")
    room = band(250, "ball", "plastic", "lid", "roomStill", "mid")
    cen = [tau(2000, "bulk", "glass", "lid", "fridgeStatic", "unproofed")["tau_eff_h"],
           tau(250, "ball", "plastic", "lid", "fridgeStatic", "mid")["tau_eff_h"],
           tau(250, "ball", "plastic", "lid", "roomStill", "mid")["tau_eff_h"]]
    segs_h = [(4.0, 4.0) + bulk, (10.0, 4.0) + balls, (3.0, 24.0) + room]
    shared_h = [path_fixed(25.0, segs_h, lambda i, lo, hi, v=v: hi if v else lo) for v in (0, 1)]
    cases.append(fx("h: 2 kg bulk in the fridge 4 h, divided into 250 g balls in the fridge 10 h, then 3 h at room",
                    dict(startC=25.0, freshDosePct=1.0, steps=[
                        dict(hours=4.0, ambientC=4.0, massG=2000, thermal=dict(geometry="bulk", container=dict(material="glass", cover="lid"), environment="fridgeStatic", porosity="unproofed")),
                        dict(hours=10.0, ambientC=4.0, massG=2000, thermal=dict(geometry="ball", pieces=8, container=dict(material="plastic", cover="lid"), environment="fridgeStatic", porosity="mid")),
                        dict(hours=3.0, ambientC=24.0, massG=2000, thermal=dict(geometry="ball", pieces=8, container=dict(material="plastic", cover="lid"), environment="roomStill", porosity="mid"))]),
                    dict(tauEffBandH=[[rnd(x, 4) for x in b] for b in (bulk, balls, room)],
                         progressCentral=rnd(path_fixed(25.0, segs_h, lambda i, lo, hi: cen[i]), 5),
                         progressBand=[rnd(path_progress(25.0, segs_h, False), 5), rnd(path_progress(25.0, segs_h, True), 5)],
                         sharedCornersBandWrong=[rnd(min(shared_h), 5), rnd(max(shared_h), 5)]),
                    dict(progress=0.0005, tauEffH=0.0005),
                    "A container change starts a new step with its own band; the dough temperature carries over. The two fridge steps cool and the room step warms, so the envelope takes each step's lag at the end that keeps the dough warmest (upper) or coldest (lower), independently per step. Using the low or the high end of every band at once gives sharedCornersBandWrong, narrower, and must not be returned."))
    # (i) personal factor: narrowing from two calibration sets, and inconsistency
    t_c = tau(500, "bulk", "glass", "lid", "fridgeStatic", "unproofed")["tau_eff_h"]
    b_c = band(500, "bulk", "glass", "lid", "fridgeStatic", "unproofed")
    def personal(sets):
        f = math.exp(sum(math.log(x) for x in sets) / len(sets))
        full = (f * b_c[0], f * b_c[1])
        if len(sets) < 2:
            return f, full, False
        spread = (min(sets) * t_c, max(sets) * t_c)
        if max(sets) / min(sets) > 1.5:
            return f, (min(full[0], spread[0]), max(full[1], spread[1])), True
        return f, (min(spread[0], 0.85 * f * t_c), max(spread[1], 1.15 * f * t_c)), False
    rows = {}
    for label, sets in (("none", []), ("one", [1.2]), ("two", [1.1, 1.25]), ("inconsistent", [0.8, 1.4])):
        if not sets:
            rows[label] = dict(factor=1.0, tauBandH=[rnd(b_c[0], 4), rnd(b_c[1], 4)], inconsistent=False)
            continue
        f, bnd, bad = personal(sets)
        rows[label] = dict(sets=sets, factor=rnd(f, 4), tauBandH=[rnd(bnd[0], 4), rnd(bnd[1], 4)], inconsistent=bad)
    cases.append(fx("i: personal factor, 500 g bulk, lidded glass bowl, static fridge",
                    dict(massG=500, thermal=dict(geometry="bulk", container=dict(material="glass", cover="lid"), environment="fridgeStatic", porosity="unproofed")),
                    dict(tauEffH=rnd(t_c, 4), **rows),
                    dict(tauEffH=0.0005),
                    "One set scales the full band. Two consistent sets narrow it to their spread times the central tau_eff, never inside +/-15 % of the calibrated value (ASSUMED floor for an informal home probe; not a confidence interval). Sets whose factors differ by more than x1.5 are inconsistent: the band is the union of the scaled full band and the spread, and the estimate says thermal_factor_inconsistent."))
    # (j) calibration with self-heating: the factor does not depend on factors stored before (0.22.0)
    t_j = tau(500, "bulk", "glass", "lid", "roomStill", "unproofed")["tau_eff_h"]
    dose_j, amb_j = 0.3, 24.0
    psi1 = EA / (R * (amb_j + 273.15) ** 2) * t_j * DT_AD * rate(amb_j, dose_j)
    tau_obs = 1.25 * t_j
    r_j = tau_obs / t_j
    f_j = r_j / (1 + r_j * psi1)
    cases.append(fx("j: calibration with self-heating, 500 g bulk, lidded glass bowl, still room, 0.3 % fresh yeast",
                    dict(massG=500, thermal=dict(geometry="bulk", container=dict(material="glass", cover="lid"), environment="roomStill", porosity="unproofed"),
                         ambientC=amb_j, freshDosePct=dose_j, tauObsH=rnd(tau_obs, 5)),
                    dict(tauEffH=rnd(t_j, 5), psi1=rnd(psi1, 5), r=rnd(r_j, 5), factor=rnd(f_j, 5), psiOfFactor=rnd(f_j * psi1, 5),
                         consistency=rnd(r_j * (1 - f_j * psi1) - f_j, 9),
                         factor021WithStoredFactor1=rnd(r_j * (1 - psi1), 5), factor021WithStoredFactor2=rnd(r_j * (1 - 2 * psi1), 5)),
                    dict(factor=0.0005, psi=0.0005),
                    "psi1 is the Semenov number at the ambient with f = 1; the observed lag is the coupled one, tau_obs = f tau_eff / (1 - f psi1), so f = r / (1 + r psi1) with r = tau_obs / tau_eff, whatever was stored before. consistency is r (1 - f psi1) - f and must be 0. The two factor021 values show the 0.21.0 rule, which used the stored factor in psi: they differ, so the order of calibrations changed the result. The engine must never return them."))
    # (k) Guggenheim selection: the widest equally spaced triple fails, a narrower one is valid (0.22.1)
    tau_k, tinf_k = 2.5, 4.0
    exact_k = {t: round(tinf_k + (24 - tinf_k) * math.exp(-t / tau_k), 4) for t in (1.0, 2.0, 3.0)}
    last_k = round(exact_k[3.0] + 2.0, 4)  # dough taken out of the fridge before the reading: T5 > T3, ratio < 0
    reads_k = [(1.0, exact_k[1.0]), (2.0, exact_k[2.0]), (3.0, exact_k[3.0]), (5.0, last_k)]

    def spaced(g1, g2):
        return abs(g1 - g2) <= 0.10 * (g1 + g2) / 2

    triples = []
    for i in range(len(reads_k)):
        for j in range(i + 1, len(reads_k)):
            for l in range(j + 1, len(reads_k)):
                (ta_, a_), (tb_, b_), (tc_, c_) = reads_k[i], reads_k[j], reads_k[l]
                if not spaced(tb_ - ta_, tc_ - tb_):
                    continue
                ratio = (a_ - b_) / (b_ - c_)
                triples.append(dict(timesH=[ta_, tb_, tc_], ratio=rnd(ratio, 4), valid=ratio > 1))
    valid_k = [t for t in triples if t["valid"]]
    chosen = max(valid_k, key=lambda t: (t["timesH"][2] - t["timesH"][0], -t["timesH"][0]))
    va = {t: c for t, c in reads_k}
    ta_k, tinf_k2 = guggenheim(*(va[t] for t in chosen["timesH"]), (chosen["timesH"][2] - chosen["timesH"][0]) / 2)
    cases.append(fx("k: Guggenheim selection, the widest equally spaced triple fails and a narrower one calibrates",
                    dict(readings=[dict(tH=t, C=c) for t, c in reads_k], spacingTolerance="10 % of the mean of the two gaps"),
                    dict(equallySpacedTriples=triples, chosenTimesH=chosen["timesH"], tauH=rnd(ta_k, 4), tInfC=rnd(tinf_k2, 3),
                         exactInputs=dict(tauH=tau_k, tInfC=tinf_k)),
                    dict(tauH=0.002, temperatureC=0.01),
                    "Readings of a 24 C dough cooling to 4 C with tau 2.5 h at 1, 2 and 3 h (rounded to 4 decimals); the 5 h reading is 2 K above the 3 h one, as when the dough was taken out of the fridge before it. The widest equally spaced triple (1, 3, 5 h) has a negative ratio and is invalid; the 0.22.0 rule refused the set. The valid triple (1, 2, 3 h) gives back tau 2.5 h and T_inf 4 C. The set records those three readings."))
    json.dump(dict(format="flourprint-fixture/0", contract="fermentation.md", model=dict(id="flourprint.dough-thermal", version="0.1.0"),
                   cases=cases), __import__("sys").stdout, indent=2, ensure_ascii=False)
    print()


if __name__ == "__main__":
    main()
