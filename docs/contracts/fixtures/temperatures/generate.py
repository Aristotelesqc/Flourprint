"""Reference cases for docs/contracts/bake-session.md (Preparation temperatures, 0.26.0) and
docs/contracts/fermentation.md (Water temperature, Suggested dough target), computed outside the
engine. No import from packages/.

Run: python3 -I generate.py > cases.json (in this directory), then prettier --write cases.json

* water cases: the base-temperature method, exact rational arithmetic (Fraction), written as floats.
* friction cases: the same relation solved for the friction, exact.
* suggested dough target: the kinetic law of fermentation.md (A 3.43 h, k 0.729, Ea 98.3 kJ/mol,
  r = 1 at 21.1 °C, fixed lag tau 1.5 h, no thermal inputs, no self-heating term), the default
  readiness profile (F* = 1), a trapezoid of 20 000 steps per step on the analytic dough temperature
  and a bisection to 1e-9 °C. The range solves the same plan with every dough-step duration
  multiplied, then divided, by the predictive factor 1.9 (docs/science/fermentation-model.md,
  section 15, RMS factor x1.89).
"""
import json
import math
from fractions import Fraction as Fr

R = 8.314462618
TREF = 294.25
A, K, EA, TAU = 3.43, 0.729, 98300.0, 1.5
FSTAR = 1.0
FACTOR = 1.9
TMIN, TMAX = 1.7, 35.0  # the temperature gate of the Domain table
H = 3600
INSTANT_TO_FRESH = 1 / 0.33


def r(t):
    return math.exp((EA / R) * (1 / TREF - 1 / (t + 273.15)))


def progress(dose, t0, plan, n=20000):
    """F at the end of `plan` = [(hours, ambient °C)], the dough starting at t0, lag tau."""
    temp, total = t0, 0.0
    for hours, ambient in plan:
        if hours == 0:
            continue
        dt = hours / n
        rate = lambda s: dose**K / A * r(ambient + (temp - ambient) * math.exp(-s / TAU))
        total += sum((rate(i * dt) + rate((i + 1) * dt)) * dt / 2 for i in range(n))
        temp = ambient + (temp - ambient) * math.exp(-hours / TAU)
    return total


def solve(dose, plan):
    """The starting temperature that reaches F* at the end of the plan, or why there is none."""
    if progress(dose, TMAX, plan) < FSTAR:
        return "too_slow"
    if progress(dose, TMIN, plan) > FSTAR:
        return "too_fast"
    lo, hi = TMIN, TMAX
    for _ in range(60):
        mid = (lo + hi) / 2
        if progress(dose, mid, plan) >= FSTAR:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def scaled(plan, s):
    return [(h * s, t) for h, t in plan]


def process(mix_conditions, rest):
    steps = [{"id": "mix", "operation": "mix", "dependsOn": [], "schedule": "asap",
              "plannedDurationS": 600, "conditions": mix_conditions}]
    prev = "mix"
    for st in rest:
        steps.append({"dependsOn": [prev], "schedule": "asap", **st})
        prev = st["id"]
    steps.append({"id": "preheat", "operation": "preheat", "dependsOn": [], "schedule": "alap",
                  "plannedDurationS": H, "conditions": {"temperatureC": 250}})
    steps.append({"id": "bake", "operation": "bake", "dependsOn": [prev, "preheat"],
                  "schedule": "asap", "plannedDurationS": 2400})
    return {"steps": steps}


def formula(instant_pct=None, fresh_pct=None):
    known = {"status": "known", "valuePct": 0}
    ingredients = [
        {"id": "water", "kind": "water", "bakerPct": 70, "role": "dough"},
        {"id": "salt", "kind": "other", "bakerPct": 2, "role": "dough", "water": known, "fat": known, "sugar": known},
    ]
    if instant_pct is not None:
        ingredients.append({"id": "yeast", "kind": "other", "bakerPct": instant_pct, "role": "dough",
                            "water": known, "fat": known, "sugar": known, "yeast": {"form": "instant"}})
    else:
        ingredients.append({"id": "yeast", "kind": "other", "bakerPct": fresh_pct, "role": "dough",
                            "water": known, "fat": known, "sugar": known, "yeast": {"form": "fresh"}})
    return {"flours": [{"id": "flour", "sharePct": 100}], "ingredients": ingredients, "components": [],
            "anchor": {"kind": "flourTotal", "grams": 1000}}


def num(x):
    return float(x)


cases = []

# --- Liquid target (fermentation.md, Water temperature; bake-session.md, Preparation temperatures)
# T_liquid = n x T_dough − T_flour − T_room − T_preferment − friction
def liquid(n, dough, flour, room, pref, friction):
    return n * Fr(dough) - Fr(flour) - Fr(room) - (Fr(pref) if pref is not None else 0) - Fr(friction)

water = [
    ("W1 planned: dough 24, room 22, flour at room, no friction",
     {"doughTargetC": 24, "room": ("planned", 22), "flour": ("assumed", 22), "frictionC": ("assumed", 0)}, 3, 24, 22, 22, None, 0),
    ("W2 the baker raises the room to 26: flour still assumed at room",
     {"doughTargetC": 24, "room": ("adjusted", 26), "flour": ("assumed", 26), "frictionC": ("assumed", 0)}, 3, 24, 26, 26, None, 0),
    ("W3 flour measured at 18 with the room at 26",
     {"doughTargetC": 24, "room": ("adjusted", 26), "flour": ("measured", 18), "frictionC": ("assumed", 0)}, 3, 24, 26, 18, None, 0),
    ("W4 W3 with a friction of 6 declared on the mixing step",
     {"doughTargetC": 24, "room": ("adjusted", 26), "flour": ("measured", 18), "frictionC": ("planned", 6)}, 3, 24, 26, 18, None, 6),
    ("W5 with a poolish measured at 20: n = 4",
     {"doughTargetC": 24, "room": ("planned", 22), "flour": ("assumed", 22), "prefermentC": ("measured", 20), "frictionC": ("planned", 5)}, 4, 24, 22, 22, 20, 5),
]
for name, inputs, n, dough, room, flour, pref, friction in water:
    value = liquid(n, dough, flour, room, pref, friction)
    cases.append({"name": name, "kind": "liquidTarget", "n": n, "inputs": inputs,
                  "expected": {"liquidTargetC": num(value)}, "exact": {"liquidTargetC": str(value)},
                  "tolerance": 1e-9})

# Measured liquid against its target (W3 inputs): the liquid was measured at 31.
cases.append({"name": "W6 deviation of a measured liquid from its target (W3 inputs, measured 31)",
              "kind": "liquidDeviation", "expected": {"targetC": 28.0, "measuredC": 31.0, "deviationC": 3.0},
              "tolerance": 1e-9})

# --- Friction sample: friction = n x T_dough − T_flour − T_room − T_liquid − T_preferment
def friction(n, dough, flour, room, liq, pref):
    return n * Fr(dough) - Fr(flour) - Fr(room) - Fr(liq) - (Fr(pref) if pref is not None else 0)

samples = [
    ("F1 direct dough, flour and liquid measured",
     3, 25, ("measured", 20), 22, ("measured", 27), None),
    ("F2 same readings, flour not measured (assumed at the room 22)",
     3, 25, ("assumed", 22), 22, ("measured", 27), None),
    ("F3 with a poolish measured at 20 (n = 4)",
     4, Fr(49, 2), ("assumed", 22), 22, ("measured", 27), ("measured", 20)),
]
for name, n, dough, flour, room, liq, pref in samples:
    value = friction(n, dough, flour[1], room, liq[1], pref[1] if pref else None)
    cases.append({"name": name, "kind": "frictionSample", "n": n, "doughMeasuredC": num(Fr(dough)),
                  "inputs": {"flour": {"source": flour[0], "valueC": flour[1]}, "roomC": room,
                             "liquid": {"source": liq[0], "valueC": liq[1]},
                             **({"preferment": {"source": pref[0], "valueC": pref[1]}} if pref else {})},
                  "expected": {"frictionC": num(value)}, "exact": {"frictionC": str(value)},
                  "tolerance": 1e-9})

# --- Suggested dough target
def target_case(name, dose_instant, rest):
    dose = dose_instant * INSTANT_TO_FRESH
    plan = [(st["plannedDurationS"] / H, st["conditions"]["temperatureC"]) for st in rest]
    value = solve(dose, plan)
    expected = {}
    if isinstance(value, str):
        expected["doughTarget.status"] = "out_of_domain"
        expected["doughTarget.reason"] = "plan_unreachable_" + value
    else:
        expected["doughTarget.value"] = value
        lo, hi = solve(dose, scaled(plan, FACTOR)), solve(dose, scaled(plan, 1 / FACTOR))
        if isinstance(lo, str) or isinstance(hi, str):
            missing = [side for side, v in (("below", lo), ("above", hi)) if isinstance(v, str)]
            expected["doughTarget.range"] = None
            expected["doughTarget.assumptions"] = ["band_unbounded:" + "+".join(missing)]
        else:
            expected["doughTarget.range"] = [lo, hi]
        if value < 15:
            expected["doughTarget.extrapolations"] = ["dough_target_below_15c"]
        if value > 32:
            expected["doughTarget.extrapolations"] = ["dough_target_above_32c"]
    cases.append({"name": name, "kind": "suggestedDoughTarget", "formula": formula(instant_pct=dose_instant),
                  "process": process({"temperatureC": 24}, rest), "expected": expected, "tolerance": 0.01})


def dough(step_id, op, hours, temp, **extra):
    cond = {"temperatureC": temp, **extra}
    return {"id": step_id, "operation": op, "plannedDurationS": round(hours * H), "conditions": cond}

retard = lambda h: dough("retard", "retard", h, 4, location="fridge")
target_case("E1 0.25 % instant: 1 h bulk at 24, 10 h fridge at 4, 1 h proof at 24",
            0.25, [dough("bulk", "bulk", 1, 24), retard(10), dough("proof", "proof", 1, 24)])
target_case("E2 0.2 % instant, 2 h / 12 h / 1 h: the lower end of the range has no solution",
            0.2, [dough("bulk", "bulk", 2, 24), retard(12), dough("proof", "proof", 1, 24)])
target_case("E3 0.4 % instant, 2 h / 12 h / 1 h: a cold dough, below the usual window",
            0.4, [dough("bulk", "bulk", 2, 24), retard(12), dough("proof", "proof", 1, 24)])
cases.append({"name": "E4 0.01 % fresh, 3 h at 22: even a 35 °C dough is too slow",
              "kind": "suggestedDoughTarget", "formula": formula(fresh_pct=0.01),
              "process": process({"temperatureC": 24}, [dough("bulk", "bulk", 3, 22)]),
              "expected": {"doughTarget.status": "out_of_domain", "doughTarget.reason": "plan_unreachable_too_slow"}
              if progress(0.01, TMAX, [(3, 22)]) < FSTAR else {"ERROR": "case is not unreachable"},
              "tolerance": 0.01})
cases.append({"name": "E5 0.9 % instant, 4 h + 1.5 h at 22: even a 1.7 °C dough is too fast",
              "kind": "suggestedDoughTarget", "formula": formula(instant_pct=0.9),
              "process": process({"temperatureC": 24}, [dough("bulk", "bulk", 4, 22), dough("proof", "proof", 1.5, 22)]),
              "expected": {"doughTarget.status": "out_of_domain", "doughTarget.reason": "plan_unreachable_too_fast"}
              if progress(0.9 * INSTANT_TO_FRESH, TMIN, [(4, 22), (1.5, 22)]) > FSTAR else {"ERROR": "case is not unreachable"},
              "tolerance": 0.01})

print(json.dumps({
    "format": "flourprint-fixture/0",
    "contract": "bake-session.md, fermentation.md",
    "contractVersion": "0.26.0",
    "model": {"id": "flourprint.commercial-yeast", "version": "0.1.0"},
    "readiness": {"id": "flourprint.model-end-point", "version": "1", "readyProgress": FSTAR},
    "predictiveFactor": FACTOR,
    "tolerance": 0.01,
    "cases": cases,
}, ensure_ascii=False, indent=1))
