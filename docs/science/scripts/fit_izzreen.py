"""Reproduce the Izzreen 2016 Table I endpoint fits (docs/science/fermentation-model.md).

Run: python3 -I docs/science/scripts/fit_izzreen.py

Fits ln(endpoint hours) by ordinary least squares on the nine cells of
docs/science/data/izzreen-2016-table1.csv. Models, with z = ln(fresh yeast %) and
x = 1000 * (1/(incubator K) - 1/294.25):

  M1  [1, z, x]        separable Arrhenius
  M2  [1, z, T-21.1]   separable Q10 (ln t linear in incubator temperature)
  M5  [1, z, x, z*x]   reciprocal-temperature interaction
  M6  [1, z, T-21.1, z*(T-21.1)]  linear-temperature interaction

This is an endpoint fit, not an application rate law. It imports nothing from the app.
"""

import csv
import math
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "..", "data", "izzreen-2016-table1.csv")
T_REF_K = 294.25  # 21.1 degC
R_KJ = 8.314462618e-3  # kJ/(mol K)


def load():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    temp = np.array([float(r["incubator_c"]) for r in rows])
    dose = np.array([float(r["fresh_yeast_pct_flour"]) for r in rows])
    minutes = np.array([float(r["endpoint_min"]) for r in rows])
    return temp, dose, minutes


def design(model, temp, dose):
    z = np.log(dose)
    x = 1000.0 * (1.0 / (temp + 273.15) - 1.0 / T_REF_K)
    u = temp - 21.1
    one = np.ones_like(z)
    columns = {
        "M1": [one, z, x],
        "M2": [one, z, u],
        "M5": [one, z, x, z * x],
        "M6": [one, z, u, z * u],
    }[model]
    return np.column_stack(columns)


def ols(X, y):
    return np.linalg.lstsq(X, y, rcond=None)[0]


def holdout_rmse(model, temp, dose, y, groups):
    """RMSE of ln t over held-out cells; each fold refits on the remaining cells."""
    errors = []
    for g in np.unique(groups):
        test = groups == g
        beta = ols(design(model, temp[~test], dose[~test]), y[~test])
        pred = design(model, temp[test], dose[test]) @ beta
        errors.extend(pred - y[test])
    return math.sqrt(np.mean(np.square(errors)))


# Shipped model 0.1.0 constants, copied from docs/contracts/fermentation.md (not imported).
SHIPPED = {"A_h": 3.43, "k": 0.729, "Ea_kJ": 98.3}


def shipped_hours(dose, temp):
    """Hours to F = 1 under model 0.1.0 (Craig's unit), constant temperature."""
    arrhenius = math.exp(SHIPPED["Ea_kJ"] / R_KJ * (1.0 / T_REF_K - 1.0 / (temp + 273.15)))
    return SHIPPED["A_h"] * dose ** -SHIPPED["k"] / arrhenius


def side_by_side(temp, dose, minutes):
    X = design("M5", temp, dose)
    m5 = np.exp(X @ ols(X, np.log(minutes / 60.0)))
    print("cell (degC, % fresh): measured h | M5 fit h | model 0.1.0 h | measured / model 0.1.0")
    for i in range(len(minutes)):
        h = minutes[i] / 60.0
        s = shipped_hours(dose[i], temp[i])
        print(f"  {temp[i]:4.0f} {dose[i]:3.0f}%: {h:7.3f} | {m5[i]:7.3f} | {s:7.3f} | {h / s:5.2f}")
    print("apparent dose exponent per incubator temperature (OLS of ln t on ln dose):")
    for t in np.unique(temp):
        m = temp == t
        slope = np.polyfit(np.log(dose[m]), np.log(minutes[m]), 1)[0]
        print(f"  {t:4.0f} degC: k = {-slope:.4f}")


def main():
    temp, dose, minutes = load()
    n = len(minutes)
    y = np.log(minutes / 60.0)
    cells = np.arange(n)
    results = {}
    for model in ("M1", "M2", "M5", "M6"):
        X = design(model, temp, dose)
        beta = ols(X, y)
        sse = float(np.sum((X @ beta - y) ** 2))
        q = len(beta) + 1  # regression coefficients plus the residual variance
        aic = n * math.log(sse / n) + 2 * q
        aicc = aic + 2 * q * (q + 1) / (n - q - 1)
        max_ratio = float(np.exp(np.max(np.abs(X @ beta - y))))
        results[model] = (aic, aicc)
        print(f"{model}: log RMSE {math.sqrt(sse / n):.6f}  AIC {aic:.4f}  AICc {aicc:.4f}"
              f"  max multiplicative error {max_ratio:.3f}")
        print(f"    leave-one-cell-out log RMSE {holdout_rmse(model, temp, dose, y, cells):.6f}"
              f"  leave-temperature-out {holdout_rmse(model, temp, dose, y, temp):.6f}"
              f"  leave-dose-out {holdout_rmse(model, temp, dose, y, dose):.6f}")
        if model == "M1":
            print(f"    A = {math.exp(beta[0]):.4f} h (1 % fresh, 21.1 degC)  k = {-beta[1]:.6f}"
                  f"  Ea = {beta[2] * R_KJ * 1000:.3f} kJ/mol")
        if model == "M5":
            print(f"    A = {math.exp(beta[0]):.6f} h  k0 = {-beta[1]:.6f}"
                  f"  Ea0 = {beta[2] * R_KJ * 1000:.6f} kJ/mol"
                  f"  interaction = {-beta[3] * R_KJ * 1000:.6f} kJ/mol")
            print("    (Ea(d) = Ea0 - interaction * ln d, d in % fresh yeast)")
    for model in ("M2", "M5", "M6"):
        d_aic = results[model][0] - results["M1"][0]
        d_aicc = results[model][1] - results["M1"][1]
        print(f"{model} - M1: dAIC {d_aic:.4f}  dAICc {d_aicc:.4f}")
    sse = {}
    for model in ("M1", "M5"):
        X = design(model, temp, dose)
        sse[model] = float(np.sum((X @ ols(X, y) - y) ** 2))
    f_stat = (sse["M1"] - sse["M5"]) / (sse["M5"] / (n - 4))
    print(f"nested F (M5 vs M1, 1 and {n - 4} degrees of freedom): {f_stat:.4f}")
    print("apparent activation energy per dose (OLS of ln t on 1000/T term):")
    for d in np.unique(dose):
        m = dose == d
        x = 1000.0 * (1.0 / (temp[m] + 273.15) - 1.0 / T_REF_K)
        slope = np.polyfit(x, np.log(minutes[m] / 60.0), 1)[0]
        print(f"  {d:3.0f} % fresh: Ea = {slope * R_KJ * 1000:.2f} kJ/mol")
    side_by_side(temp, dose, minutes)


if __name__ == "__main__":
    main()
