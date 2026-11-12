SYNTHETIC RFI / CHANGE ORDER DATASET – Sound Transit East Link (Bellevue/Overlake) & Downtown Redmond Link

Purpose: test whether categorizing RFIs by content can produce a meaningful importance ranking. ALL RFIs, change orders, amounts, dates and outcomes are synthetic (randomly generated with a fixed seed, 20261012). They are not Sound Transit records.

WHAT IS REAL (anchors from official/public sources)

• Downtown Redmond Link: 3.4 mi, 2 stations (Marymoor Village, Downtown Redmond), ~1,400-stall garage; baseline budget $1.53B (Board R2018-37, Oct 2018); single design-build contract; baseline NTP Q3 2019; opened May 10, 2025; Stacy Witbeck/Kuney JV; $25M contingency motion M2025-09 (Feb 2025, project 97% complete).

• East Link: baseline $3.677B (2015), later raised to $3.82B; civil packages E130/E320/E330/E335/E340/E360 plus E750 Systems; construction began 2016; 2 Line South Bellevue–Redmond Technology opened April 2024.

• E330 Bellevue tunnel: Atkinson low bid $121,446,551; authorized $133,591,206 (10% contingency). E360: Kiewit-Hoffman East Link Constructors, $225,336,088 base, $247,869,697 authorized, NTP June 2016. E340: Max J. Kuney, authorized cap $107,487,012 (M2021-06). E335: Stacy and Witbeck/Atkinson JV GC/CM (Feb 2017), +$10M contingency (M2021-05), board cited numerous design-related issues. E750: LTK Engineering is DSDC (M2020-19).

• Sound Transit reported East Link float was consumed by delays (E335/E750 area most); DRLE retained schedule float. The generator reflects this: higher critical-path delay and slower responses on E335/E750, lighter on DRLE.

WHAT IS ESTIMATED / SYNTHETIC

• Contract base values for E320, E335, E750, DRLE and the E320/E750 contractor names are NOT in the sources reviewed – see Contracts!source_status. Replace with Board motion values if you need exact figures.

• RFI counts (1,370), RFI text, dates, response times, cost and delay distributions are modeled. Total RFI-linked approved cost is calibrated to a % of contract base per package (see Contracts column and Summary sheet): E320 5.5%, E330 7%, E335 9%, E340 6%, E360 6.5%, E750 8%, DRLE 3%. These percentages are my modeling assumptions, not published figures.

HOW THE DATA WAS GENERATED

1. Each package gets RFIs spread over its construction window (bell-shaped intensity, weekdays only) with a category mix that fits its scope (e.g., E330 heavy on ground conditions, E750 on systems interfaces).

2. Each content category has its own probabilities/size for cost claims, schedule claims, critical-path exposure, response time and change-order conversion (Data_Dictionary + Summary show the resulting rates).

3. Contractor priority flag is deliberately NOISY (weakly correlated with true impact) so it does not trivially solve the ranking problem.

4. RFIs that convert are grouped into change orders (1–4 RFIs each, same package/category within ~90 days), then given outcomes: negotiated reduction, as requested, global settlement, rejected, withdrawn, partial, or DRB-escalated, with realistic cycle times.

5. true_priority_tier / rank / impact_score are GROUND TRUTH built from actual outcomes (approved cost 50%, critical-path delay 30%, float consumed 10%, time granted 10%). Tiers by rank: P1 top 8%, P2 next 17%, P3 next 30%, P4 rest.

HOW TO RUN YOUR TEST

• Use only columns flagged "Y" under available_at_submittal in Data_Dictionary as features (content category, location, spec section, package, discipline, contractor flags, description text). Exclude response/outcome/cost columns – they would leak the answer.

• Compare: (a) baseline = contractor_priority_flag, (b) category-only ranking, (c) category + location + critical-path flag, (d) text model on description. Evaluate against true_priority_tier (e.g., precision@P1/P2, Spearman vs true_priority_rank).

• Caveat: the category effects were built in by design, so a positive result confirms the pipeline works, not that real Sound Transit RFIs behave this way. Validate on real data before relying on it.

SHEETS: Contracts · RFIs · Change_Orders · CO_Outcomes · RFI_CO_Link · Data_Dictionary · Summary (live formulas). CSV copies provided separately. Cost fields in USD (year of expenditure, nominal).
