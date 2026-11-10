"""Reference cases for docs/contracts/bake-session.md (Preparation temperatures, 0.26.0) and
docs/contracts/fermentation.md (Water temperature, Suggested dough target), computed outside the
engine. No import from packages/.

Run: python3 -I generate.py (in this directory; writes cases.json as UTF-8), then prettier --write cases.json.
Reproduction holds to about 1e-9 (the E cases) and exactly for the W and F cases.

* water cases: the base-temperature method, exact rational arithmetic (Fraction), written as floats.
* friction cases: the same relation solved for the friction, exact.
* suggested dough target: the kinetic law of fermentation.md (A 3.43 h, k 0.729, Ea 98.3 kJ/mol,
  r = 1 at 21.1 °C, fixed lag tau 1.5 h, no thermal inputs, no self-heating term), the default
  readiness profile (F* = 1), a trapezoid of 20 000 steps per step on the analytic dough temperature
  and a bisection to 1e-9 °C (the contract solves to 0.001 °C; the fixture tolerance is 0.02 °C). The range solves the same plan with every dough-step duration
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
                  "process": process({"temperatureC": 24}, rest), "expected": expected, "tolerance": 0.02})


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
              "tolerance": 0.02})
cases.append({"name": "E5 0.9 % instant, 4 h + 1.5 h at 22: even a 1.7 °C dough is too fast",
              "kind": "suggestedDoughTarget", "formula": formula(instant_pct=0.9),
              "process": process({"temperatureC": 24}, [dough("bulk", "bulk", 4, 22), dough("proof", "proof", 1.5, 22)]),
              "expected": {"doughTarget.status": "out_of_domain", "doughTarget.reason": "plan_unreachable_too_fast"}
              if progress(0.9 * INSTANT_TO_FRESH, TMIN, [(4, 22), (1.5, 22)]) > FSTAR else {"ERROR": "case is not unreachable"},
              "tolerance": 0.02})

# W7: a preferment whose step states no temperature is taken at the room (assumed); n = 4.
value = liquid(4, 24, 22, 22, 22, 5)
cases.append({"name": "W7 poolish with no temperature of its own: assumed at the room",
              "kind": "liquidTarget", "n": 4,
              "inputs": {"doughTargetC": 24, "room": ("planned", 22), "flour": ("assumed", 22),
                         "prefermentC": ("assumed", 22), "frictionC": ("planned", 5)},
              "expected": {"liquidTargetC": num(value)}, "exact": {"liquidTargetC": str(value)},
              "tolerance": 1e-9})

# C1: basic mode, no declared target: the suggestion of E3 feeds the liquid target (room 22,
# flour assumed at the room, no friction). Flagged water_below_0C, never clipped.
e3 = next(c for c in cases if c["name"].startswith("E3"))["expected"]["doughTarget.value"]
cases.append({"name": "C1 chain: suggested dough target (E3) then liquid target, room 22",
              "kind": "suggestedThenLiquid", "uses": "E3", "n": 3,
              "inputs": {"room": ("planned", 22), "flour": ("assumed", 22), "frictionC": ("assumed", 0)},
              "expected": {"doughTarget.source": "suggested", "doughTarget.value": e3,
                           "liquidTargetC": 3 * e3 - 22 - 22, "liquid.assumptions": ["water_below_0C"]},
              "tolerance": 0.02})

# F4 to F6: which dough reading makes a friction sample (times in minutes from the end of the
# reference mixing step; a single mix, so it is also the first-contact step).
for name, minutes, eligible in [
    ("F4 dough read 8 min after the end of the mix: eligible", 8, True),
    ("F5 dough read 12 min after the end of the mix: not eligible", 12, False),
]:
    cases.append({"name": name, "kind": "frictionWindow", "readingMinutesAfterEnd": minutes,
                  "windowMinutes": 10, "expected": {"sample": eligible}})
cases.append({"name": "F6 frasage then mix: a reading at the end of the frasage is not a sample; "
                      "one on the mix is, flagged friction_after_first_contact",
              "kind": "frictionAttribution",
              "expected": {"readingAtEndOfFirstContact.sample": False,
                           "readingOnReferenceStep.sample": True,
                           "readingOnReferenceStep.assumptions": ["friction_after_first_contact"]}})

# W8: the room cools. Target dough 24, planned room 22, noted 19; the flour, assumed at the room,
# follows: 3 x 24 - 19 - 19 = 34.
value = liquid(3, 24, 19, 19, None, 0)
cases.append({"name": "W8 the room cools to 19: a warmer liquid",
              "kind": "liquidTarget", "n": 3,
              "inputs": {"doughTargetC": 24, "room": ("adjusted", 19), "flour": ("assumed", 19),
                         "frictionC": ("assumed", 0)},
              "expected": {"liquidTargetC": num(value)}, "exact": {"liquidTargetC": str(value)},
              "tolerance": 1e-9})

# R1 to R3: the room line (bake-session.md, The room line). Recipe: mix (counter, 23), bulk 4 h
# (counter, 23), retard 12 h (fridge, 4), proof 1.5 h (counter, 23); the bulk starts at hour 0, the
# retard at hour 4, the proof at hour 16. A step is a room step when its location is absent or
# `counter`.
cases.append({"name": "R1 the room cools: 19 noted 1 h into the bulk, carried to the end",
              "kind": "roomLine", "roomLine": [[1, 19]],
              "expected": {"bulk": "23 until 1 h, then 19", "retard": "4 (placed in the fridge, unchanged)", "proof": "19 from its start (carried to the end)"}})
cases.append({"name": "R2 the room warms: 26 noted at the start of the bulk",
              "kind": "roomLine", "roomLine": [[0, 26]],
              "expected": {"bulk": "26", "retard": "4", "proof": "26"}})
cases.append({"name": "R4 a change noted before the step starts: 21 noted during the autolyse, mix and bulk follow it",
              "kind": "roomLine", "recipe": "autolyse (counter, 23), mix (counter, 23), bulk (counter, 23), retard (fridge, 4)",
              "roomLine": [["during the autolyse", 21]],
              "expected": {"mix": "21 from its start (the planned 23 does not win)", "bulk": "21", "retard": "4 (placed in the fridge)"}})
cases.append({"name": "R3 a second change at the start of the proof, then AdjustStep on the proof",
              "kind": "roomLine", "roomLine": [[1, 19], [16, 21]],
              "adjustStep": {"proof": {"at": 16.5, "temperatureC": 24}},
              "expected": {"proof": "21 from its start (hour 16), 24 from hour 16.5 (the later instant wins)"}})

# T1: where a dough reading falls (bake-session.md, What the model uses). Preparation times in
# minutes from the start: autolyse 0-30, mix (first contact) 30-40, bulk 40-280, shape 280-300,
# bake (heat step) from 300.
placement = [
    ("autolyse", 10, 24.0, False, "reading_before_dough"),
    ("during the mix", 35, 25.0, True, "start of the clock"),
    ("at the end of the mix", 40, 25.0, True, "start of the clock"),
    ("during the bulk", 100, 27.0, True, "mean state from its instant"),
    ("during the bake", 330, 96.0, False, "reading_above_model_range"),
    ("during the bake, 55 C", 330, 55.0, False, "reading_after_dough"),
]
cases.append({"name": "T1 placement of dough readings by effective instant",
              "kind": "readingPlacement",
              "steps": {"autolyse": [0, 30], "mix": [30, 40], "bulk": [40, 280], "shape": [280, 300], "bake": [300, None]},
              "readings": [{"label": l, "instantMin": t, "valueC": v, "usedByModel": u, "use": w}
                           for l, t, v, u, w in placement],
              "correction": {"reading": "during the bulk", "newInstantMin": 35,
                             "effect": "moves from the mean state of the bulk to the start of the clock"}})

# O1: appliance readings are journal and export only (bake-session.md, applianceTemperature).
cases.append({"name": "O1 oven history: 250 planned, 205 after opening the door, 240 four minutes later",
              "kind": "applianceReadings", "plannedSetpointC": 250,
              "readings": [{"appliance": "oven", "instant": "18:12", "valueC": 205.0},
                           {"appliance": "oven", "instant": "18:16", "valueC": 240.0}],
              "expected": {"usedByModel": False, "ignoredBy": "appliance_reading_not_modelled",
                           "planChanged": False, "inJournalBackupAndExports": True,
                           "rangeC": [0, 500]}})

out = json.dumps({
    "format": "flourprint-fixture/0",
    "contract": "bake-session.md, fermentation.md",
    "contractVersion": "0.26.0",
    "model": {"id": "flourprint.commercial-yeast", "version": "0.1.0"},
    "readiness": {"id": "flourprint.model-end-point", "version": "1", "readyProgress": FSTAR},
    "predictiveFactor": FACTOR,
    "tolerance": 0.02,
    "cases": cases,
}, ensure_ascii=False, indent=1)
with open("cases.json", "w", encoding="utf-8") as f:
    f.write(out + "\n")
