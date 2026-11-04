# Source index

One row per source considered for the fermentation and thermal models. It records where a source
can be read legally, who read it and how far, what it measures, and what Flourprint does with it.
It is the reference for checking any report against the primary sources.

- **No PDFs in this repository.** Link the DOI, the publisher's open copy, PubMed Central, an
  institutional repository or an author copy. Never link an unauthorised copy. Local PDFs stay in
  git-ignored folders or with the owner. Publisher download stamps (names, IP addresses) are not
  copied anywhere.
- **Read status** uses the labels of [README.md](README.md): `full` (full text read, by whom),
  `abstract`, `secondary` (known through another text), `external` (read by an agent outside the
  repository, relayed by the owner, not re-read here).
- **Numbers** go in a `data/` file with its own metadata, only when a table is useful to a fit or a
  test. Values read from a figure say so.
- A report that cites a source not listed here, or with a different reading, is checked against
  this index before it is used.

## Dough datasets

| Source                                                               | Access                                       | Read                                                                        | Measures                                                                         | Data                                                 | Use                                                                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Izzreen M. N. et al. 2016, _Cereal Chem._ 93(2):209–216              | DOI 10.1094/CCHEM-09-14-0196-R               | full, Codex review                                                          | Wholemeal dough, fresh yeast 2/4/6 %, incubator 8, 16 and 32 °C, time to peak height     | [data](data/izzreen-2016-table1.md)                  | Primary dough dataset; model comparison, section 5                                                                               |
| Timmermans E. et al. 2022, _Foods_ 11(10):1388                       | DOI 10.3390/foods11101388 (CC BY)            | full, coordinating agent, 2026-11-04                                        | Pastry dough, 7 % fresh yeast, sucrose 0–18 % as-is, 30 °C, 3-h CO2              | [data](data/timmermans-2022-sucrose.md)              | Sugar effect, section 6; time courses not transcribed                                                                            |
| Boudrag S. et al. 2026, _Foods_ 15(13):2343                          | DOI 10.3390/foods15132343 (CC BY)            | full, coordinating agent, 2026-10-30; PDF also read 2026-11-04              | NaCl 0–1.2 % in three flours, rheofermentometer                                  | [data](data/boudrag-2026-salt.md)                    | Salt effect, section 8                                                                                                           |
| Kyogoku Y., Ouchi K. 1995, _Appl. Environ. Microbiol._ 61(2):639–642 | ASM journal site                             | full, coordinating agent, 2026-11-04                                        | Sweet dough, 3 % wet yeast, 2-h gas from 0 to 40 °C; 7-day storage at 0–5 °C     | [data](data/kyogoku-1995-fig2.md) (read from Fig. 2) | Only dough curve below 15 °C; section 12                                                                                         |
| Paquet-Durand O. et al. 2020, _Processes_ 8(12):1669                 | DOI 10.3390/pr8121669 (CC BY)                | full, coordinating agent, 2026-11-04                                        | 50 g dough balls, 2 g yeast, bubble model with an extended Kalman filter, 50 min | none                                                 | Online estimation, not open-loop forecasting; Table 1 confirms the R2.2 review (bubble density 2·10¹¹ m⁻³, viscosity 4·10⁷ Pa·s) |
| Chevallier S. et al. 2012, _Food Bioprocess Technol._ 5:609–617      | DOI 10.1007/s11947-009-0319-3                | external (Opus report on #33, full)                                         | Lean dough, 5 % fresh yeast, 25/30/35 °C, Gompertz parameters                    | none                                                 | Warm-range slope only (about 53 kJ/mol, fitted by Opus); not transferable to the cold                                            |
| Belz M. C. E. et al. 2017, _Foods_ 6(8):66                           | DOI 10.3390/foods6080066 (CC BY)             | external (Opus report, full; Table 2 confirmed by a second external reader) | 30 °C, 2 % instant yeast, NaCl 0–5.8 %, CO2 totals                               | none                                                 | Salt effect, second dataset; one temperature and dose                                                                            |
| Birch A. N. et al. 2013, _J. Cereal Sci._ 58:318–323                 | DOI 10.1016/j.jcs.2013.05.009 (paywall)      | abstract (Opus report)                                                      | Seven commercial yeasts, 2–12 %, 5/15/25/35 °C, dough height                     | none                                                 | Only other dough study at 5 °C; rate constants not seen                                                                          |
| Stanke M. et al. 2014, _J. Food Eng._ 131:58–64                      | DOI 10.1016/j.jfoodeng.2014.01.012 (paywall) | abstract                                                                    | 2 and 4 % fresh yeast, 28–35 °C, rheofermentometer                               | none                                                 | Replicate spread (9–40 %), as quoted in the preview                                                                              |

## Yeast physiology outside dough

| Source                                                                | Access                                       | Read                                                         | Measures                                                                                      | Data | Use                                                                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Salvadó Z. et al. 2011, _Appl. Environ. Microbiol._ 77(7):2292–2302   | DOI 10.1128/AEM.01861-10                     | full, coordinating agent, 2026-11-04                         | CTMI growth parameters of 27 strains in liquid medium, 4–46 °C                                | none | Plausibility bounds: 10 _S. cerevisiae_ strains (none from bakeries) have `T_min` 0.4–5.0 °C, `T_opt` 30.0–34.8 °C, `T_max` 42.0–46.1 °C (Table 2). Growth, not dough gas |
| Lip K. Y. F. et al. 2020, _Biotechnol. Rep._ 26:e00462                | DOI 10.1016/j.btre.2020.e00462 (CC BY-NC-ND) | full text available, skimmed, coordinating agent, 2026-11-04 | Industrial strains, 12–40 °C, chemostats                                                      | none | Strain spread at sub-optimal temperatures; low relevance to dough                                                                                                         |
| Gänzle M. G. et al. 1998, _Appl. Environ. Microbiol._ 64(7):2616–2623 | ASM journal site                             | full text available, skimmed, coordinating agent, 2026-11-04 | Sourdough _L. sanfranciscensis_ and _C. milleri_: growth against temperature, pH, NaCl, acids | none | Future sourdough model: _C. milleri_ `T_opt` 27 °C, `T_max` 36 °C, tolerates 8 % NaCl                                                                                     |

## Dough and fridge heat transfer

| Source                                                                           | Access                                  | Read                                                              | Measures                                                    | Data | Use                                                                |
| -------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| Williams T. L., Clausing A. M., Newell T. A. 1994, ACRC TR-54, Univ. of Illinois | IDEALS, hdl.handle.net/2142/9756 (open) | external (owner's extract: abstract, conclusions, Tables 5.2–5.6) | Natural convection on fridge walls, closed door, ice-filled | none | Convective `h` 1.5–3.1 W/m²·K on a wall–contents basis; section 14 |
| Laguerre O. 2010 (HAL hal-00579333); Lança et al. 2025                           | HAL; publisher                          | as claimed by the #176 reports (Argon), not read here             | Domestic-fridge heat transfer, radiation share              | none | Basis of `h_ext` fridgeStatic in the contract; still unverified    |

## Model outputs and practice data

| Source                                           | Access            | Read                      | Measures                     | Data                                      | Use                                                |
| ------------------------------------------------ | ----------------- | ------------------------- | ---------------------------- | ----------------------------------------- | -------------------------------------------------- |
| TXCraig1 yeast prediction table, pizzamaking.com | forum (bot check) | secondary (transcription) | Model output, not dough data | contract                                  | Shipped constants; MODEL OUTPUT                    |
| Published recipes (89)                           | see the data file | as recorded there         | Practice schedules           | [data](data/published-recipes-2026-10.md) | Benchmark of the "agreement with practice" measure |
| Style guides                                     | see the data file | web excerpts              | Consensus ranges per style   | [data](data/style-guides.md)              | Template versions, not a contract                  |

The remaining references of the first reports, with their arbitration record, are in
[fermentation-model.md, section 10](fermentation-model.md#10-corrected-bibliography).
