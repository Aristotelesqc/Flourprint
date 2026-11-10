# Home measurements: what the owner's bakes can settle

The model's weakest points are the cold end of the curve, the dough's cooling in a real fridge,
and the end point. The science document's evidence sections (`fermentation-model.md`, sections
12 and 15) and #231 (section 5) find that the literature cannot fix them. The measurements below
can. They are listed in the contract's calibration order: thermal first, on a weakly fermenting
dough, then kinetics (`docs/contracts/fermentation.md`, Personal correction). They are
calibration evidence, never a gate for a feature (`docs/contracts/capability-levels.md`). Each
protocol says what to record. A measurement without its conditions is not usable as data.

Units, as the repository stores them: masses in grams, temperatures in °C, times as read on the
clock (converted later), heights in millimetres, percentages of flour in points.

## Equipment

- A probe thermometer readable to 0.1 °C. That is its resolution, not its accuracy. Before a
  series, check it in iced water (stirred crushed ice and water, 0 °C) and record the offset. A
  wired probe left in the dough is best.
- A fridge thermometer, with its sensor in a small jar of water on the shelf where the dough
  sits. The air swings with each compressor cycle; the jar shows the shelf's mean.
- Straight-sided transparent containers with a scale, or a strip of tape marked in millimetres. A
  rise ratio needs vertical walls: in a bowl, height does not follow volume.
- A kitchen scale (grams) and a clock.
- For section 4 only: an enclosure that holds a temperature within ±0.5 °C, such as a proofing
  box, or an oven with the light on, a door ajar and a probe to check it.

## Always record

- Flour product and yeast product.
- The yeast form (fresh, active dry or instant), with its lot or best-before date.
- Every ingredient mass, the dough mass, and the container (material, lid or not).
- Each step's start and end time, and the room or fridge temperature.
- The dough temperature at the end of the mix.

In the app:

- the bake's steps as actually done;
- each move between room and fridge, recorded as a thermal change (`SetStepThermal`, bake-session.md);
- dough-temperature observations on a running dough step, with the probe position (`core`,
  `surface` or `unknown`; bake-session.md, `doughTemperature`);
- "dough ready" when the dough is judged ready.

## 1. Cooling curves in the owner's fridge (thermal model, #176)

Settles: the cooling time constant of a real dough in a real fridge. It drives most of the
fermentation in an overnight retard, and today it is a prior.

- **Dough.** A dummy dough without yeast (flour, water and salt at the usual hydration), so that
  no self-heating confounds the curve. The contract refuses a set where self-heating matters
  (`self_heating_confounds`).
- **Cases.** About 300 g, 1 kg and 2 kg, each once with a lid and once without, in the usual
  containers. Repeat one case (1 kg, lid) on another day to see the spread from run to run.
- **Probe.** At the centre, inserted before the dough goes in, its cable under the lid's edge or
  through a small hole drilled in the lid.
- **Readings.** Read the dough and the shelf jar on a regular grid: every 30 min for 300 g, every
  hour for 1 kg and 2 kg. Keep reading until the dough is within 1 °C of the shelf.
  - The contract's estimators need equally spaced readings, and they ignore those taken before
    half a time constant. The early readings are kept but not used.
  - From about 20 °C above the shelf, getting within 1 °C takes about 3 time constants (ln 20).
    With the spread of `τ` in the science document (section 14: 1.3 to 3.4 h for 250 g, 3.5 to
    7.3 h for 2 kg), that is about 4 to 10 h for 300 g and 10 to 22 h for 2 kg. Start the large
    cases in the morning.
- **Door.** Keep it closed during the readings. A change of ambient makes the set unusable
  (contract: the ambient must be the same over the readings used). If it was opened, note when.
- **Water jar.** A water jar of the same mass is a sanity check of the probe and the shelf, not a
  control: water convects inside and cools faster than dough.

## 2. Cold ladder and long retard (cold end of the curve)

Settles how fast the owner's yeast works at 4 to 15 °C, relative to 24 °C. At 4 °C the shipped law
gives 5.7 % of the 24 °C rate. The published estimates give 0.2 to 3 % (section 12), and the one
dough measurement below 15 °C, Kyogoku 1995, gives 3.0 % of the 20 °C gas at 5 °C.

- **Dose.** These are not home doses. Use about 2 % instant yeast on flour, so that a 100 g jar
  rises by a measurable height within the readings. At a home dose a jar at 4 °C may rise about
  1 mm in two days. Use the same dose for every jar of a series.
- **Ladder.**
  - Split one dough into jars of about 100 g: two at about 4 °C, one at 8 °C, two at 12 °C, one at
    15 °C, and one at 24 °C as the reference.
  - Bring each jar to its temperature quickly (pre-cooled in water).
  - Places: fridge zones, a cellar, or a cooler with ice packs. These do not hold a temperature
    well, so log the dough temperature of each jar at every reading. The analysis uses the
    logged history, not the nominal value.
  - Readings: height and probe temperature at 0, 12, 24 and 48 h. Read the 24 °C jar every
    30 min until it peaks.
  - The rate is the slope of log height over the early, roughly linear part. A jar that has
    peaked or collapsed is not read past its peak.
- **Long retard.**
  - Split one dough into four portions. One is warmed at once (day 0); the others are held 1, 3
    and 5 days at a measured fridge temperature, then warmed at room temperature.
  - For each portion, record the core temperature at the start of the warm-up, then the time
    from that start until the dough reaches a fixed height ratio of 1.5. Use the same ratio for
    every portion.
  - The difference from day 0 is what the hold costs, whatever the cause.
  - These holds cross the 72 h and 10 °C boundaries of the learning flags (#259). They are the
    data that would give `cold_stage_uncalibrated` an exit, once a contract defines one.

## 3. End point (readiness height)

Settles the rise ratio at which the owner calls a dough ready. The default profile uses the
model's own end point (`F* = 1`). The selectable `flourprint.experimental-ready` profile assumes a
ratio of 2.0, band 1.5 to 2.5 (`fermentation-model.md`, section 4). No data yet link a height
ratio to `F`; this protocol is what would build that link.

- **Bulk only.** Measure the bulk in a straight-sided container. A shaped loaf in a banneton or a
  pizza on a peel cannot be measured this way.
- **Baseline.** Mark the height at the end of the mix. A fold degasses the dough, so note each
  fold and its time. Keep the end-of-mix baseline anyway.
- **Ready.** Mark the height at the moment the dough is judged ready by the usual criteria (poke,
  jiggle, dome). Ratio = height at ready / height at the end of the mix.
- **In the app.** Record "dough ready" at that moment, with the dough temperatures. The model's
  `F` at that instant can then be read back from the bake.
- **How many.** At least 5 bakes per dough type (lean loaf, pizza). A median outside 1.5 to 2.5,
  or a spread wider than that band, is a reason to propose a new profile band.

## 4. Dose and temperature ladders (optional)

Settles the dose exponent and the warm slope on the owner's own yeast.

- **Dose.**
  - 0.1, 0.2, 0.5 and 1.0 % instant yeast on flour, same dough and container, in the enclosure
    at 24 ± 0.5 °C.
  - A kitchen scale cannot weigh 0.1 g. Make a slurry instead: for example 1.0 g yeast in 100 g
    water, then 10 g of it per 100 g flour for 0.1 %. Count the slurry's water in the hydration.
  - Read every 30 min at 1.0 %, every hour at 0.5 %, and every 2 h at 0.1 and 0.2 %. The low
    doses run overnight.
  - The shipped exponent `k` is 0.729, with a band of 0.6 to 0.9 (contract, Parameters). A
    fitted exponent outside that band is a reason to propose a contract change.
- **Temperature.**
  - 16, 20, 24 and 28 °C at 0.5 % instant yeast. The dose matters here, because dose and
    temperature interact (science document, sections 2 and 5, model M5).
  - Read the height every hour, every 30 min at 28 °C.
  - 28 °C sits on the warm boundary of the learning flags (#259).

## What waits for a laboratory

These stay open questions in #231. No home protocol replaces them.

- Gas production at 2 to 8 °C at home doses, with pre-equilibrated dough.
- The effect of salt at home doses, measured as a rate.
- The cause of the activity lost in long cold holds (sugars, viability, ethanol, pH).
- The biological lag at home doses.
