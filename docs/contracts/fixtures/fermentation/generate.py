"""Reference cases for docs/contracts/fermentation.md, computed outside the engine.

Run: python3 -I generate.py > cases.json (in this directory)
Closed forms where the temperature is constant; otherwise a fine trapezoid on the analytic dough
temperature (first-order lag), independent of the engine's integrator.
"""
import json
import math

R = 8.314462618
TREF = 294.25
A, K, EA, TAU = 3.43, 0.729, 98300.0, 1.5
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

# 1. 1 % fresh at 21.1 °C: the end point takes A hours; the band is A × [0.75, 1.25] since
#    d^−k = 1 and r = 1 for every corner.
cases.append({
    "name": "reference point: 1 % fresh yeast at 21.1 °C",
    "formula": flour([salt(), yeast("fresh", 1)]),
    "process": steps({"temperatureC": 21.1}, [{"id": "proof", "operation": "proof"}]),
    "expected": {"dough.duration.value": A * H, "dough.duration.range": [0.75 * A * H, 1.25 * A * H]},
})

# 2. 0.5 % instant in a fridge at 4 °C from the start: constant temperature, t = A d^−k / r(4).
d = 0.5 * FRESH["instant"]
cases.append({
    "name": "constant 4 °C, 0.5 % instant",
    "formula": flour([salt(), yeast("instant", 0.5)]),
    "process": steps({"temperatureC": 4}, [{"id": "retard", "operation": "bulk"}]),
    "expected": {"dough.duration.value": A * d ** -K / r(4) * H},
})

# 3. Inverse: 2 h + 1 h at 25 °C, active dry. d^k / A × r(25) × 3 = 1.
d = (A / (3 * r(25))) ** (1 / K)
cases.append({
    "name": "inverse dose: 3 h at 25 °C, active dry",
    "formula": flour([salt(), yeast("active-dry", 0.5)]),
    "process": steps({"temperatureC": 25}, [
        {"id": "bulk", "operation": "bulk", "plannedDurationS": 2 * H},
        {"id": "proof", "operation": "proof", "plannedDurationS": H},
    ]),
    "expected": {
        "dough.yeastPct.yeast.value": d / FRESH["active-dry"],
        "dough.progressPct.value": 100 * (0.5 * FRESH["active-dry"]) ** K / A * r(25) * 3,
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
    if g1 + lagged_gain(d, t0, 4, mid, n=20000) >= 1:
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

print(json.dumps({"format": "flourprint-fixture/0", "contract": "fermentation.md", "model": {"id": "flourprint.commercial-yeast", "version": "0.1.0"}, "tolerance": 1, "cases": cases}, indent=2))
