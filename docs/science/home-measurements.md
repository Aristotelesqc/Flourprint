# Home measurements: what the owner's bakes can settle

The external reports and the published-practice study (#226) agree that the literature cannot fix
the model's weakest points: the cold end of the curve, the dough's cooling in a real fridge, and
the end point. These measurements are the ones that can, ordered by what they settle (#231, section 5).
They are calibration evidence, never a gate for a feature (`docs/contracts/capability-levels.md`).
Each protocol says what to record; a measurement without its conditions is not usable as data.

## Equipment

- A probe thermometer readable to 0.1 °C (a wired probe left in the dough is best), and a fridge
  thermometer at the shelf where the dough sits.
- Straight-sided transparent containers with a scale, or a strip of tape marked in millimetres. A
  rise ratio needs vertical walls: in a bowl, height does not follow volume.
- A kitchen scale (grams) and a clock; times are written as read.

## Always record

Flour product, yeast product and form (fresh, active dry, instant) with its lot or best-before
date, every ingredient mass, the dough mass, the container (material, lid or not), each step's
start and end time, the room or fridge temperature, and the dough temperature at the end of the
mix. In the app: the bake's steps as actually done, dough-temperature observations on the dough
steps, and "dough ready" when the dough is judged ready.

## 1. Cooling curves in the owner's fridge (thermal model, #176)

Settles: the cooling time constant of a real dough in a real fridge, which drives most of the
fermentation in an overnight retard and is today a prior.

- Doughs of about 300 g, 1 kg and 2 kg, each once with a lid and once without, in the usual
  containers. One water jar of the same mass as a control.
- Probe at the centre, inserted before the dough goes in. Read the dough and the fridge air at
  0, 15, 30, 45, 60, 90 min, then every hour until within 1 °C of the fridge (about 4 to 11 h for
  1 kg).
- Note the shelf, and whether the fridge door was opened.

## 2. Cold ladder and long retard (cold end of the curve)

Settles: how fast the owner's yeast works at 4 to 15 °C, where the shipped law and the only
published dough curve disagree (5.7 % against 0.2 to 3 % of the 24 °C rate at 4 °C).

- **Ladder.** One dough split into four jars of about 100 g, each brought to its temperature
  quickly (pre-cooled in water) and held at about 4, 8, 12 and 15 °C (fridge zones, a cellar, a
  cooler with ice packs). Height and probe temperature at 0, 12, 24 and 48 h.
- **Long retard.** One dough held 1, 3 and 5 days at a measured fridge temperature (three
  portions), then warmed at room temperature; time from the start of the warm-up to the usual
  readiness height. This measures what long holds cost, whatever the cause.

## 3. End point (readiness height)

Settles: the rise ratio at which the owner calls a dough ready. The model's 2.0 target is an
assumed prior.

- In a straight-sided container, mark the height at the end of shaping or of the mix (the start),
  then the height at the moment the dough is judged ready, by the usual criteria (poke, jiggle,
  dome). Ratio = height at ready / height at start.
- Record "dough ready" in the app at that moment. A few bakes per dough type (lean loaf, pizza)
  are enough to start.

## 4. Dose and temperature ladders (optional)

Settles: the dose exponent and the warm slope on the owner's own yeast.

- **Dose:** 0.1, 0.2, 0.5 and 1.0 % instant yeast (on flour), same dough and container, at
  24 ± 0.5 °C; height every hour.
- **Temperature:** 16, 20, 24 and 28 °C at one dose; height every hour.

## What waits for a laboratory

Gas production at 2 to 8 °C at home doses with pre-equilibrated dough, salt at home doses measured
as a rate, the cause of the activity lost in long cold holds (sugars, viability, ethanol, pH), and
the biological lag at home doses. They stay open questions in #231; no home protocol replaces them.
