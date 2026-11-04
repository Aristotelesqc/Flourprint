"""Reference cases for docs/contracts/fermentation.md, computed outside the engine.

The dough's end point is the readiness profile flourprint.experimental-ready@1 of fermentation.md
(READY, band READY_BAND), named in the output so the test passes it explicitly;
the preferment's end point is 1.

Dough clock (contract 0.24.0, owner decisions of 2026-11-04): the progress of the dough is 0 at
the END of the first-contact step (process.md, First contact); the first-contact step's own
duration does not count. Cases 1 to 4 below have the 10 min `mix` as their only mixing step with no
incorporations declared, so that `mix` is the first-contact step and nothing lies between its end
and the end of the last mixing step: their values are those of contract 0.23.0, unchanged. The
cases named `first contact:` are written for the new clock and carry "since": "0.10.0", the
engine version from which they apply; a harness skips them for an older engine.

Run: python3 -I generate.py > cases.json (in this directory), then prettier --write cases.json
Closed forms where the temperature is constant; otherwise a fine trapezoid on the analytic dough
temperature (first-order lag), independent of the engine's integrator.
"""
import json
import math

R = 8.314462618
TREF = 294.25
A, K, EA, TAU = 3.43, 0.729, 98300.0, 1.5
READY, READY_BAND = 2.0, (1.5, 2.5)  # dough end point F*, provisional (fermentation.md)
FRESH = {"fresh": 1.0, "active-dry": 1 / 0.40, "instant": 1 / 0.33}
H = 3600


def r(t, ea=EA):
    return math.exp((ea / R) * (1 / TREF - 1 / (t + 273.15)))


def flour(ingredients):
    return {
        "flours": [{"id": "flour", "sharePct": 100}],
        "ingredients": [{"id": "water", "kind": "water", "bakerPct": 65, "role": "dough"}]
        + ingredients,
        "components": [],
        "anchor": {"kind": "flourTotal", "grams": 1000},
    }


def salt(pct=2):
    k = {"status": "known", "valuePct": 0}
    return {"id": "salt", "kind": "other", "bakerPct": pct, "role": "dough", "water": k, "fat": k, "sugar": k}


def yeast(form, pct):
    k = {"status": "known", "valuePct": 0}
    return {"id": "yeast", "kind": "other", "bakerPct": pct, "role": "dough", "water": k, "fat": k, "sugar": k, "yeast": {"form": form}}


def steps(mix_conditions, rest):
    s = [{"id": "mix", "operation": "mix", "dependsOn": [], "schedule": "asap", "plannedDurationS": 600, "conditions": mix_conditions}]
    prev = "mix"
    for st in rest:
        s.append({"dependsOn": [prev], "schedule": "asap", **st})
        prev = st["id"]
    s.append({"id": "preheat", "operation": "preheat", "dependsOn": [], "schedule": "alap", "plannedDurationS": H, "conditions": {"temperatureC": 250}})
    s.append({"id": "bake", "operation": "bake", "dependsOn": [prev, "preheat"], "schedule": "asap", "plannedDurationS": 2400})
    return {"steps": s}


def lagged_gain(d, t0, ta, hours, n=200000):
    """Progress over `hours` with T(t) = ta + (t0 − ta) e^(−t/τ), trapezoid."""
    total = 0.0
    dt = hours / n
    f = lambda h: d ** K / A * r(ta + (t0 - ta) * math.exp(-h / TAU))
    for i in range(n):
        total += (f(i * dt) + f((i + 1) * dt)) * dt / 2
    return total


cases = []

# 1. 1 % fresh at 21.1 °C: the dough takes READY × A hours; every other corner factor is 1
#    (d^−k = 1, r = 1), so the band is A × [0.75, 1.25] × READY_BAND.
cases.append({
    "name": "reference point: 1 % fresh yeast at 21.1 °C",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": steps({"temperatureC": 21.1}, [{"id": "proof", "operation": "proof"}]),
    "expected": {
        "dough.duration.value": READY * A * H,
        "dough.duration.range": [0.75 * READY_BAND[0] * A * H, 1.25 * READY_BAND[1] * A * H],
    },
})

# 2. 0.5 % instant in a fridge at 4 °C from the start: constant temperature, t = A d^−k / r(4).
d = 0.5 * FRESH["instant"]
cases.append({
    "name": "constant 4 °C, 0.5 % instant",
    "formula": flour([salt(), yeast("instant", 0.5)]),
    "process": steps({"temperatureC": 4}, [{"id": "retard", "operation": "bulk"}]),
    "expected": {"dough.duration.value": READY * A * d ** -K / r(4) * H},
})

# 3. Inverse: 2 h + 1 h at 25 °C, active dry. d^k / A × r(25) × 3 = READY.
d = (READY * A / (3 * r(25))) ** (1 / K)
cases.append({
    "name": "inverse dose: 3 h at 25 °C, active dry",
    "formula": flour([salt(), yeast("active-dry", 0.5)]),
    "process": steps({"temperatureC": 25}, [
        {"id": "bulk", "operation": "bulk", "plannedDurationS": 2 * H},
        {"id": "proof", "operation": "proof", "plannedDurationS": H},
    ]),
    "expected": {
        "dough.yeastPct.yeast.value": d / FRESH["active-dry"],
        "dough.progressPct.value": 100 * (0.5 * FRESH["active-dry"]) ** K / A * r(25) * 3 / READY,
    },
})

# 4. Lag: 2 h bulk at 24 °C, then the fridge at 4 °C for the rest, 0.2 % fresh. The dough starts
#    at 24 °C, cools with τ = 1.5 h; the open fridge step needs the time to finish.
d = 0.2
g1 = lagged_gain(d, 24, 24, 2)
t0 = 24.0
lo, hi = 0.0, 500.0
for _ in range(60):
    mid = (lo + hi) / 2
    if g1 + lagged_gain(d, t0, 4, mid, n=20000) >= READY:
        hi = mid
    else:
        lo = mid
cases.append({
    "name": "thermal lag into the fridge, 0.2 % fresh",
    "formula": flour([salt(), yeast("fresh", 0.2)]),
    "process": steps({"temperatureC": 24}, [
        {"id": "bulk", "operation": "bulk", "plannedDurationS": 2 * H},
        {"id": "retard", "operation": "proof", "conditions": {"location": "fridge", "temperatureC": 4}},
    ]),
    "expected": {"dough.duration.value": (lo + hi) / 2 * H},
    "tolerance": 60,
})

# 5. Water temperature, no preferment: 3 × 26 − 20 − 20 − 5 (friction) = 33.
cases.append({
    "name": "water temperature, direct dough with friction",
    "formula": flour([salt(), yeast("instant", 0.5)]),
    "process": steps({"temperatureC": 20, "doughTemperatureC": 26, "frictionC": 5}, [{"id": "proof", "operation": "proof"}]),
    "expected": {"waterTemperatureC.value": 33},
})

# 6. A preferment keeps the end point 1: a poolish with 0.2 % of the total flour as fresh yeast in
#    20 % of the flour is 1 % fresh in the poolish; at 21.1 °C it is ripe after A hours.
poolish = flour([salt(), yeast("fresh", 0.2)])
poolish["components"] = [{
    "id": "poolish", "kind": "preferment", "flourPct": 20,
    "flourBlend": [{"flour": "flour", "sharePct": 100}], "hydrationPct": 100,
    "allocations": [{"ingredient": "yeast", "bakerPct": 0.2}],
}]
pf = steps({"temperatureC": 21.1, "doughTemperatureC": 24}, [{"id": "proof", "operation": "proof"}])
pf["steps"] = [{"id": "poolish", "operation": "preferment", "dependsOn": [], "schedule": "asap", "conditions": {"temperatureC": 21.1}}] + [
    {**st, "dependsOn": ["poolish"]} if st["id"] == "mix" else st for st in pf["steps"]
]
cases.append({
    "name": "preferment keeps its own end point (progress 1)",
    "formula": poolish,
    "process": pf,
    "expected": {"preferments.poolish.duration.value": A * H},
})

# ---------------------------------------------------------------------------------------------
# First contact (contract 0.24.0): the dough clock starts at the END of the first-contact step.
# Every step has a planned duration, so the engine reports the progress at the end of each dough
# step (the steps after the first-contact step, which is not itself a dough step).
# ---------------------------------------------------------------------------------------------
def inc_all(yeast_here=True, flour_here=True, salt_here=True):
    out = []
    if flour_here:
        out.append({"item": "flour", "id": "flour", "sharePct": 100})
        out.append({"item": "water", "sharePct": 100})
    if salt_here:
        out.append({"item": "ingredient", "id": "salt", "sharePct": 100})
    if yeast_here:
        out.append({"item": "ingredient", "id": "yeast", "sharePct": 100})
    return out


def chain(specs, tail_dep=None):
    """specs: (id, operation, minutes, conditions, incorporations or None); linear, then preheat and bake."""
    out, prev = [], None
    for sid, op, minutes, cond, incs in specs:
        st = {"id": sid, "operation": op, "dependsOn": [prev] if prev else [], "schedule": "asap",
              "plannedDurationS": minutes * 60}
        if cond is not None:
            st["conditions"] = cond
        if incs:
            st["incorporations"] = incs
        out.append(st)
        prev = sid
    out.append({"id": "preheat", "operation": "preheat", "dependsOn": [], "schedule": "alap", "plannedDurationS": H, "conditions": {"temperatureC": 250}})
    out.append({"id": "bake", "operation": "bake", "dependsOn": [prev, "preheat"], "schedule": "asap", "plannedDurationS": 2400})
    return {"steps": out}


def const_pct(d, t_c, minutes):
    """Progress, in percent of the end point, after `minutes` at a constant temperature and dose d."""
    return 100 * d ** K / A * r(t_c) * (minutes / 60) / READY


def step_ends(d, t_c, minutes_list):
    """End-of-step progress for the DOUGH steps (the first-contact step is not in `minutes_list`)."""
    total, out = 0, {}
    for i, m in enumerate(minutes_list):
        total += m
        out[f"dough.steps.{i}.endProgressPct.value"] = const_pct(d, t_c, total)
    out["dough.progressPct.value"] = const_pct(d, t_c, total)
    return out, total


TOL_CONST = 0.001  # percentage points / seconds: closed forms in double precision

# (a) Direct dough: mixing with the yeast 5 min (first contact, not counted), kneading 10 min,
#     bulk 120 min; 24 °C everywhere, 1 % fresh yeast. The dough steps are the kneading and the bulk.
mins = [10, 120]
exp, total = step_ends(1, 24, mins)
exp["dough.duration.value"] = (READY * A / r(24) * H) - (total - mins[-1]) * 60  # the open last step
cases.append({
    "name": "first contact: direct dough, mixing 5 min does not count, kneading 10 min, bulk 120 min at 24 °C",
    "since": "0.10.0",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": chain([
        ("frasage", "frasage", 5, {"temperatureC": 24}, inc_all()),
        ("mix", "mix", 10, {"temperatureC": 24}, []),
        ("bulk", "bulk", 120, {"temperatureC": 24}, []),
    ]),
    "expected": exp,
    "tolerance": TOL_CONST,
})

# (b) Yeast, flour and water in a 45 min fermentolyse (first contact, not counted), then 10 min of
#     final kneading with the salt, then the bulk: the kneading and the bulk count.
mins = [10, 120]
exp, total = step_ends(1, 24, mins)
cases.append({
    "name": "first contact: 45 min fermentolyse with the yeast does not count, 10 min final kneading, bulk 120 min",
    "since": "0.10.0",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": chain([
        ("fermentolyse", "fermentolyse", 45, {"temperatureC": 24}, inc_all(salt_here=False)),
        ("mix", "mix", 10, {"temperatureC": 24}, [{"item": "ingredient", "id": "salt", "sharePct": 100}]),
        ("bulk", "bulk", 120, {"temperatureC": 24}, []),
    ]),
    "expected": exp,
    "tolerance": TOL_CONST,
})

# (c) A 30 min autolyse of flour and water, no yeast: it does not count. The mix brings the yeast
#     and salt (8 min, first contact, not counted), then the bulk: the only dough step is the bulk.
mins = [120]
exp, total = step_ends(1, 24, mins)
cases.append({
    "name": "first contact: autolyse 30 min without yeast and the 8 min mix do not count, bulk 120 min",
    "since": "0.10.0",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": chain([
        ("autolyse", "autolyse", 30, {"temperatureC": 24}, inc_all(yeast_here=False, salt_here=False)),
        ("mix", "mix", 8, {"temperatureC": 24}, [
            {"item": "ingredient", "id": "salt", "sharePct": 100},
            {"item": "ingredient", "id": "yeast", "sharePct": 100},
        ]),
        ("bulk", "bulk", 120, {"temperatureC": 24}, []),
    ]),
    "expected": exp,
    "tolerance": TOL_CONST,
})

# (d) No incorporations declared: an autolyse (not a mixing step) ahead of the first mixing step
#     never starts the clock; the frasage is the first contact and does not count. 10 + 120 min.
mins = [10, 120]
exp, total = step_ends(1, 24, mins)
cases.append({
    "name": "first contact: no incorporations declared, autolyse 30 min and the first frasage do not count",
    "since": "0.10.0",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": chain([
        ("autolyse", "autolyse", 30, {"temperatureC": 24}, None),
        ("frasage", "frasage", 5, {"temperatureC": 24}, None),
        ("mix", "mix", 10, {"temperatureC": 24}, None),
        ("bulk", "bulk", 120, {"temperatureC": 24}, None),
    ]),
    "expected": exp,
    "tolerance": TOL_CONST,
})

# (e) A poolish and a final dough. The poolish (20 % of the flour at 100 % hydration, 0.2 % of the
#     total flour as fresh yeast = 1 % of its flour, 21.1 °C) keeps its own clock: ripe after A
#     hours. The final dough has all the yeast over all the flour: 0.3 % fresh (0.2 in the poolish,
#     0.1 in the final mix). Its clock starts at the END of the mix (it incorporates the poolish
#     and the yeast: first contact), not at the poolish: bulk 120 min, proof 60 min.
pool = flour([salt(), yeast("fresh", 0.3)])
pool["components"] = [{
    "id": "poolish", "kind": "preferment", "flourPct": 20,
    "flourBlend": [{"flour": "flour", "sharePct": 100}], "hydrationPct": 100,
    "allocations": [{"ingredient": "yeast", "bakerPct": 0.2}],
}]
proc = chain([
    ("poolish", "preferment", 0, {"temperatureC": 21.1}, None),
    ("mix", "mix", 10, {"temperatureC": 24}, [
        {"item": "component", "id": "poolish", "sharePct": 100},
        {"item": "flour", "id": "flour", "sharePct": 100},
        {"item": "water", "sharePct": 100},
        {"item": "ingredient", "id": "salt", "sharePct": 100},
        {"item": "ingredient", "id": "yeast", "sharePct": 100},
    ]),
    ("bulk", "bulk", 120, {"temperatureC": 24}, []),
    ("proof", "proof", 60, {"temperatureC": 24}, []),
])
del proc["steps"][0]["plannedDurationS"]  # the poolish step is the unknown
exp, total = step_ends(0.3, 24, [120, 60])
exp["preferments.poolish.duration.value"] = A * H
cases.append({
    "name": "first contact: a poolish keeps its own clock, the final dough starts at the end of its mix",
    "since": "0.10.0",
    "formula": pool,
    "process": proc,
    "expected": exp,
    "tolerance": TOL_CONST,
})

# (e2) A preferment with a preparatory mix: the poolish is mixed 40 min (its own first-contact
#      step, subject the component), then ferments. The 40 min do not count: its clock starts at
#      the end of the mixing, so the fermenting phase takes A hours whatever the mixing lasted.
pool2 = flour([salt(), yeast("fresh", 0.2)])
pool2["components"] = [{
    "id": "poolish", "kind": "preferment", "flourPct": 20,
    "flourBlend": [{"flour": "flour", "sharePct": 100}], "hydrationPct": 100,
    "allocations": [{"ingredient": "yeast", "bakerPct": 0.2}],
}]
proc2 = chain([
    ("poolish-mix", "frasage", 40, {"temperatureC": 21.1}, None),
    ("poolish-ferment", "preferment", 0, {"temperatureC": 21.1}, None),
    ("mix", "mix", 10, {"temperatureC": 24}, [
        {"item": "component", "id": "poolish", "sharePct": 100},
        {"item": "flour", "id": "flour", "sharePct": 100},
        {"item": "water", "sharePct": 100},
        {"item": "ingredient", "id": "salt", "sharePct": 100},
        {"item": "ingredient", "id": "yeast", "sharePct": 100},
    ]),
    ("bulk", "bulk", 120, {"temperatureC": 24}, []),
])
for st in proc2["steps"]:
    if st["id"] in ("poolish-mix", "poolish-ferment"):
        st["subject"] = {"kind": "component", "id": "poolish"}
del proc2["steps"][1]["plannedDurationS"]  # the fermenting phase is the unknown
proc2["steps"][0]["dependsOn"] = []
cases.append({
    "name": "first contact: a poolish's preparatory mix 40 min does not count, it ripens A hours after it",
    "since": "0.10.0",
    "formula": pool2,
    "process": proc2,
    "expected": {"preferments.poolish.duration.value": A * H},
    "tolerance": TOL_CONST,
})

# (f) Advanced mode: the target dough temperature (26 °C) applies from the END of the first
#     contact. The mix (10 min, first contact, with the target) is not counted; the bulk (120 min,
#     20 °C) is: the dough drifts from 26 °C towards 20 °C with the default lag τ = 1.5 h from the
#     end of the mix (ASSUMED: the target is the temperature the dough has when its clock starts).
#     Trapezoid on the analytic temperature.
d = 1.0
g_all = lagged_gain(d, 26, 20, 2)
cases.append({
    "name": "first contact: target dough temperature 26 °C applied from the end of the mix, room 20 °C",
    "since": "0.10.0",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": chain([
        ("mix", "mix", 10, {"temperatureC": 20, "doughTemperatureC": 26}, inc_all()),
        ("bulk", "bulk", 120, {"temperatureC": 20}, []),
    ]),
    "expected": {
        "dough.steps.0.endProgressPct.value": 100 * g_all / READY,
        "dough.progressPct.value": 100 * g_all / READY,
        "dough.steps.0.endTemperatureC.value": 20 + 6 * math.exp(-2 / TAU),
    },
    "tolerance": 0.02,
})

# (f2) The target sits on the reference mixing step, which is not the first-contact step: a frasage
#      with the yeast (5 min, first contact, not counted), then a kneading (10 min, target 26 °C,
#      room 20 °C), then the bulk (120 min, 20 °C). The target applies from the end of the frasage:
#      the dough drifts from 26 °C over the kneading and the bulk (10 + 120 min).
g_mix = lagged_gain(d, 26, 20, 10 / 60)
g_all = lagged_gain(d, 26, 20, 130 / 60)
cases.append({
    "name": "first contact: target dough temperature on the kneading applies from the end of the frasage",
    "since": "0.10.0",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": chain([
        ("frasage", "frasage", 5, {"temperatureC": 20}, inc_all()),
        ("mix", "mix", 10, {"temperatureC": 20, "doughTemperatureC": 26}, []),
        ("bulk", "bulk", 120, {"temperatureC": 20}, []),
    ]),
    "expected": {
        "dough.steps.0.endProgressPct.value": 100 * g_mix / READY,
        "dough.steps.1.endProgressPct.value": 100 * g_all / READY,
        "dough.progressPct.value": 100 * g_all / READY,
        "dough.steps.0.endTemperatureC.value": 20 + 6 * math.exp(-(10 / 60) / TAU),
        "dough.steps.1.endTemperatureC.value": 20 + 6 * math.exp(-(130 / 60) / TAU),
    },
    "tolerance": 0.02,
})

# (g) Basic mode: the dough starts, at the end of the first contact, at the first-contact step's
#     own temperature (20 °C, the fermentolyse), not at the later mix's (24 °C): the lag towards
#     24 °C runs through the 10 min mix and the 120 min bulk. The 45 min do not count.
d = 1.0
g1 = lagged_gain(d, 20, 24, 10 / 60)
t1 = 24 + (20 - 24) * math.exp(-(10 / 60) / TAU)
g2 = g1 + lagged_gain(d, t1, 24, 2)
t2 = 24 + (t1 - 24) * math.exp(-2 / TAU)
cases.append({
    "name": "first contact: basic mode starts at the fermentolyse's 20 °C, not the later mix's 24 °C",
    "since": "0.10.0",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": chain([
        ("fermentolyse", "fermentolyse", 45, {"temperatureC": 20}, inc_all(salt_here=False)),
        ("mix", "mix", 10, {"temperatureC": 24}, [{"item": "ingredient", "id": "salt", "sharePct": 100}]),
        ("bulk", "bulk", 120, {"temperatureC": 24}, []),
    ]),
    "expected": {
        "dough.steps.0.endProgressPct.value": 100 * g1 / READY,
        "dough.steps.1.endProgressPct.value": 100 * g2 / READY,
        "dough.steps.0.endTemperatureC.value": t1,
        "dough.steps.1.endTemperatureC.value": t2,
    },
    "tolerance": 0.02,
})

# (i) A fermentolyse AFTER the frasage that brings the yeast counts: frasage 5 min (first contact,
#     not counted), fermentolyse 30 min, kneading 10 min, bulk 120 min at 24 °C.
mins = [30, 10, 120]
exp, total = step_ends(1, 24, mins)
cases.append({
    "name": "first contact: a fermentolyse and a kneading after the frasage count, the frasage does not",
    "since": "0.10.0",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": chain([
        ("frasage", "frasage", 5, {"temperatureC": 24}, inc_all()),
        ("fermentolyse", "fermentolyse", 30, {"temperatureC": 24}, None),
        ("mix", "mix", 10, {"temperatureC": 24}, None),
        ("bulk", "bulk", 120, {"temperatureC": 24}, None),
    ]),
    "expected": exp,
    "tolerance": TOL_CONST,
})

print(json.dumps({"format": "flourprint-fixture/0", "contract": "fermentation.md", "model": {"id": "flourprint.commercial-yeast", "version": "0.1.0"}, "readiness": {"id": "flourprint.experimental-ready", "version": "1"}, "calibration": {"readyProgress": READY, "band": list(READY_BAND)}, "tolerance": 1, "cases": cases}, indent=2))
