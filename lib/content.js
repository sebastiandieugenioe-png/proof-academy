// Static seed content for Online Spirits Club MVP.
// Structure supports future AI-generated content and DB migration.
// Lesson text revised and fact-checked on 2026-11-16 (sources per lesson).

export const COURSES = [
  {
    "slug": "alcohol-fundamentals",
    "title": "Alcohol Fundamentals",
    "tagline": "Start here. The science and language of every drink.",
    "level": "Beginner",
    "accent": "from-blue-500 to-cyan-500",
    "icon": "Flame",
    "lessons": [
      {
        "slug": "what-is-alcohol",
        "title": "What Is Alcohol?",
        "minutes": 4,
        "objectives": [
          "Define ethanol and how it differs from other alcohols.",
          "Understand why ethanol is the only alcohol we drink.",
          "Explain how ABV (alcohol by volume) is measured."
        ],
        "theory": "Alcohol, in the beverage world, means one specific molecule: **ethanol** (C₂H₆O). It is produced by yeast fermenting sugars, and it is the only alcohol fit for drinking (and even ethanol is harmful in large amounts). Other alcohols — methanol, isopropanol — are toxic even in small doses.\n\nEthanol is a small, versatile molecule. It is soluble in water and in fat, which is why it carries flavor so well and why it affects the brain so quickly: it crosses the blood–brain barrier within minutes.\n\nWe measure the strength of a spirit as **ABV** (alcohol by volume) — the percentage of the liquid, at 20 °C, that is pure ethanol. A bottle labeled 40% ABV contains 40 mL of ethanol in every 100 mL of liquid. In the US you may also see **proof**, which is simply ABV × 2 (so 40% ABV = 80 proof).\n\nEthanol has almost no color and only a faint, sweetish smell. Everything else you taste in a spirit — vanilla in bourbon, juniper in gin, smoke in Islay whisky — comes from the raw materials, the yeast, the water, aging, or the still. Ethanol is the vehicle; flavor is the passenger.",
        "embedded": [
          {
            "q": "Which alcohol is the one we actually drink?",
            "options": [
              "Methanol",
              "Ethanol",
              "Isopropanol"
            ],
            "correct": 1,
            "explanation": "Only ethanol is safe for consumption in moderation. Methanol and isopropanol are toxic."
          },
          {
            "q": "A spirit labeled 80 proof has an ABV of:",
            "options": [
              "20%",
              "40%",
              "80%"
            ],
            "correct": 1,
            "explanation": "US proof is exactly twice the ABV. 80 proof = 40% ABV."
          }
        ],
        "flashcards": [
          {
            "front": "What molecule is \"alcohol\" in drinks?",
            "back": "Ethanol (C₂H₆O), produced by yeast."
          },
          {
            "front": "What does ABV stand for?",
            "back": "Alcohol By Volume — % ethanol in the liquid at 20 °C."
          },
          {
            "front": "US proof to ABV formula",
            "back": "ABV = proof / 2. Example: 80 proof = 40% ABV."
          },
          {
            "front": "Why is ethanol a good flavor carrier?",
            "back": "It is soluble in both water and fat."
          },
          {
            "front": "Is methanol safe to drink?",
            "back": "No. It is toxic even in small amounts."
          }
        ],
        "quiz": [
          {
            "q": "The chemical formula for drinking alcohol is:",
            "options": [
              "CH₃OH",
              "C₂H₆O",
              "C₃H₈O"
            ],
            "correct": 1,
            "explanation": "C₂H₆O is ethanol."
          },
          {
            "q": "A bottle says 43% ABV. What is the US proof?",
            "options": [
              "43",
              "86",
              "100"
            ],
            "correct": 1,
            "explanation": "Proof = ABV × 2 = 86."
          },
          {
            "q": "Ethanol crosses into the brain quickly because it is:",
            "options": [
              "Fat soluble only",
              "Water soluble only",
              "Soluble in both water and fat"
            ],
            "correct": 2,
            "explanation": "Its dual solubility lets it cross membranes easily."
          },
          {
            "q": "Which is NOT safe to drink?",
            "options": [
              "Ethanol",
              "Methanol",
              "Water"
            ],
            "correct": 1,
            "explanation": "Methanol is toxic."
          },
          {
            "q": "The complex flavors of whiskey mostly come from:",
            "options": [
              "The ethanol itself",
              "Raw materials, yeast, and aging",
              "Adding sugar at bottling"
            ],
            "correct": 1,
            "explanation": "Ethanol is nearly flavorless; flavor comes from ingredients and process."
          }
        ],
        "sources": [
          {
            "label": "PubChem: Ethanol (boiling point, properties)",
            "url": "https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol"
          },
          {
            "label": "US definition of proof, 27 CFR 5.1",
            "url": "https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-A/section-5.1"
          },
          {
            "label": "EU Regulation 2019/787 on spirit drinks (consolidated)",
            "url": "https://eur-lex.europa.eu/eli/reg/2019/787/oj"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "fermentation-basics",
        "title": "Fermentation Basics",
        "minutes": 4,
        "objectives": [
          "Explain how yeast turns sugar into alcohol.",
          "Identify the main sugar sources used in drinks.",
          "Understand why fermentation stops around 15% ABV."
        ],
        "theory": "Fermentation is the biological engine of every alcoholic drink. In simple terms: **yeast eats sugar and produces ethanol + CO₂ + flavor**.\n\nYeast (usually Saccharomyces cerevisiae) is a single-celled fungus. Given warmth, moisture, and sugar, it multiplies rapidly and metabolizes the sugar without oxygen. The byproducts are ethanol, carbon dioxide, and a small orchestra of aromatic compounds (esters, higher alcohols, fatty acids) that give beer, wine, and the base wash of every spirit its character.\n\nDifferent drinks start with different sugars:\n\n- **Grains** (barley, corn, rye, wheat) → whisky, beer, vodka, gin base.\n- **Grapes and fruit** → wine, brandy.\n- **Sugarcane / molasses** → rum.\n- **Agave** → tequila, mezcal.\n\nGrains do not contain free sugar; their starch must be converted to sugar first, either by malting (letting the grain sprout so it makes its own enzymes) or by adding enzymes — the actual conversion happens during mashing, when the grain is steeped in hot water.\n\nMost wine and brewing yeasts tolerate roughly **12–16% ABV** before the alcohol becomes toxic to the yeast itself and fermentation stalls. That is why wine naturally finishes around 12–15% ABV (most beer is lower, around 4–6%, simply because brewers start with less sugar), and why we need **distillation** to reach the strengths of spirits.",
        "embedded": [
          {
            "q": "What does yeast produce from sugar?",
            "options": [
              "Ethanol + CO₂",
              "Ethanol + oxygen",
              "Sugar alcohols only"
            ],
            "correct": 0,
            "explanation": "Ethanol and CO₂ are the main products, plus small amounts of flavor compounds."
          }
        ],
        "flashcards": [
          {
            "front": "Fermentation equation (simplified)",
            "back": "Sugar + yeast → Ethanol + CO₂ + flavor."
          },
          {
            "front": "Most common brewing yeast",
            "back": "Saccharomyces cerevisiae."
          },
          {
            "front": "Sugar source for whisky",
            "back": "Grains (barley, corn, rye, wheat)."
          },
          {
            "front": "Sugar source for tequila",
            "back": "Agave (blue agave for tequila)."
          },
          {
            "front": "Sugar source for rum",
            "back": "Sugarcane juice or molasses."
          },
          {
            "front": "Why fermentation stops around 15% ABV",
            "back": "Alcohol becomes toxic to the yeast itself."
          }
        ],
        "quiz": [
          {
            "q": "Wine typically ends fermentation at around:",
            "options": [
              "5% ABV",
              "13% ABV",
              "40% ABV"
            ],
            "correct": 1,
            "explanation": "Wine yeast tolerates roughly 12–16% ABV."
          },
          {
            "q": "Which raw material is used for tequila?",
            "options": [
              "Corn",
              "Agave",
              "Sugarcane"
            ],
            "correct": 1,
            "explanation": "Tequila must be made from blue Weber agave — at least 51% of its sugars, or 100% in “100% agave” tequilas."
          },
          {
            "q": "Malting and mashing turn grain starch into:",
            "options": [
              "Alcohol",
              "Fermentable sugars",
              "CO₂"
            ],
            "correct": 1,
            "explanation": "Sprouting (malting) develops enzymes; in the hot-water mash they convert starch into sugar."
          },
          {
            "q": "Which is NOT a yeast byproduct in fermentation?",
            "options": [
              "Ethanol",
              "CO₂",
              "Oxygen"
            ],
            "correct": 2,
            "explanation": "Fermentation is anaerobic — no oxygen produced."
          },
          {
            "q": "The ceiling of natural fermentation is about:",
            "options": [
              "5–8% ABV",
              "12–16% ABV",
              "30–40% ABV"
            ],
            "correct": 1,
            "explanation": "Above this, yeast dies from the alcohol it made."
          }
        ],
        "sources": [
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          },
          {
            "label": "Oliver, G. (ed.), The Oxford Companion to Beer, Oxford University Press, 2011"
          },
          {
            "label": "NOM-006-SCFI-2012 Tequila (official English translation, CRT)",
            "url": "https://www.crt.org.mx/wp-content/uploads/2024/01/NOM-006-SCFI-2012%20-%20INGLES.pdf"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "distillation-explained",
        "title": "Distillation Explained",
        "minutes": 5,
        "objectives": [
          "Understand why we distill: concentrating alcohol.",
          "Distinguish pot stills from column stills.",
          "Know what heads, hearts, and tails mean."
        ],
        "theory": "Distillation is a **physical separation** technique. Ethanol boils at 78.4 °C and water at 100 °C, so if we heat a fermented liquid (\"wash\") gently, ethanol vaporizes first. We cool the vapor back into a liquid — now more concentrated in alcohol and aromatic compounds.\n\nTwo main still designs shape most of the world’s spirits:\n\n**Pot stills** are simple copper kettles. You fill them, heat them, collect the vapors, and start again. Each pass raises the ABV modestly and keeps a lot of flavor. Scotch single malt, cognac, and traditional rums use pot stills. You need at least two passes to reach spirit strength.\n\n**Column stills** (a.k.a. continuous stills, Coffey stills) are tall towers with internal plates. Wash enters continuously; steam rises; alcohol vapor is redistilled dozens of times inside the column. The result is very high purity — up to ~95% ABV — and a cleaner, lighter spirit. Vodka, most bourbons, and grain whiskies rely on columns.\n\nDuring any distillation the distiller separates the run into three parts:\n\n- **Heads** — first vapors, high in volatile, harsh compounds such as acetaldehyde and ethyl acetate (nail-polish notes). Discarded.\n- **Hearts** — the clean, drinkable core. Kept.\n- **Tails** — late, oily, low-alcohol vapors. Usually discarded or recycled.\n\nThis \"cut\" is where craft lives. Two distilleries with identical wash can make very different spirits depending on where they choose to start and stop collecting.",
        "embedded": [
          {
            "q": "Distillation works because:",
            "options": [
              "Alcohol is heavier than water",
              "Alcohol boils at a lower temperature than water",
              "Water evaporates faster than alcohol"
            ],
            "correct": 1,
            "explanation": "Ethanol boils at 78.4 °C vs 100 °C for water, so it vaporizes first."
          }
        ],
        "flashcards": [
          {
            "front": "Ethanol boiling point",
            "back": "78.4 °C (173 °F)."
          },
          {
            "front": "Pot still vs column still (in one line)",
            "back": "Pot = batches, more flavor. Column = continuous, cleaner and stronger."
          },
          {
            "front": "What are \"hearts\" in distillation?",
            "back": "The clean middle cut kept for the final spirit."
          },
          {
            "front": "What are \"heads\"?",
            "back": "First vapors, discarded — contain harsh, sometimes toxic compounds."
          },
          {
            "front": "Typical max ABV from a column still",
            "back": "Around 95–96% ABV — the ethanol–water azeotrope sets the ceiling."
          }
        ],
        "quiz": [
          {
            "q": "Which still type is used for Scotch single malt?",
            "options": [
              "Pot still",
              "Column still",
              "Neither"
            ],
            "correct": 0,
            "explanation": "By law, single malt Scotch is pot distilled."
          },
          {
            "q": "The \"heads\" of a run are:",
            "options": [
              "Kept as the best part",
              "Discarded",
              "The final tail end"
            ],
            "correct": 1,
            "explanation": "Heads are rich in volatile compounds like acetaldehyde and ethyl acetate — they are cut away."
          },
          {
            "q": "Column stills produce spirits that are typically:",
            "options": [
              "Cleaner and lighter",
              "Heavier and oilier",
              "Sweeter than pot spirits"
            ],
            "correct": 0,
            "explanation": "Multiple internal redistillations strip out flavor and produce a light, high-purity spirit."
          },
          {
            "q": "Why is copper commonly used in stills?",
            "options": [
              "It looks pretty",
              "It removes sulfur compounds",
              "It is cheap"
            ],
            "correct": 1,
            "explanation": "Copper reacts with sulfur to remove off-notes."
          },
          {
            "q": "Distillation increases alcohol by:",
            "options": [
              "Adding more sugar",
              "Fermenting again",
              "Physical separation of ethanol and water vapors"
            ],
            "correct": 2,
            "explanation": "No new alcohol is created — existing alcohol is concentrated."
          }
        ],
        "sources": [
          {
            "label": "PubChem: Ethanol (boiling point, properties)",
            "url": "https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol"
          },
          {
            "label": "The Scotch Whisky Regulations 2009",
            "url": "https://www.legislation.gov.uk/uksi/2009/2890/contents"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "aging-and-maturation",
        "title": "Aging and Maturation",
        "minutes": 4,
        "objectives": [
          "Explain what happens to spirits inside a barrel.",
          "Understand the role of new vs used oak.",
          "Know what the \"angel's share\" is."
        ],
        "theory": "Fresh off the still, most spirits are clear, sharp, and one-dimensional. Time in wood — usually oak — is what turns them into whisky, brandy, aged rum, or reposado tequila.\n\nInside a barrel three main things happen:\n\n- **Extraction.** The spirit pulls compounds directly from the wood: vanillin, lactones (coconut notes), tannins, and colors. New charred American oak is packed with these — that’s why bourbon gets its color and vanilla so fast.\n- **Oxidation.** Barrels are slightly porous. Oxygen slowly enters, mellowing harsh notes and creating new aromatic compounds — dried fruit, nuts, leather.\n- **Evaporation.** Water and alcohol escape through the wood at different rates depending on climate. Scotland (cool, damp) loses more alcohol; Kentucky (hot summers) loses more water. This is the angel’s share: around 2% per year in Scotland, and considerably more in hot climates such as Kentucky or the Caribbean.\n\nNew oak (mandatory for bourbon) is intense: lots of vanilla, coconut, spice, deep color. **Used oak** — ex-bourbon or ex-sherry casks, as in most Scotch — is gentler and lets the base spirit’s character speak, contributing subtler dried-fruit or nutty notes.\n\nOlder is not automatically better. Over-aging strips freshness and adds bitterness. A brilliant 12-year-old whisky can outshine a tired 25.",
        "embedded": [
          {
            "q": "The \"angel's share\" is:",
            "options": [
              "The portion of spirit given to workers",
              "Liquid lost to evaporation from the barrel",
              "The strongest part of the run"
            ],
            "correct": 1,
            "explanation": "It’s the poetic name for the ~2% per year (in Scotland) that evaporates through the wood."
          }
        ],
        "flashcards": [
          {
            "front": "Three barrel effects on spirit",
            "back": "Extraction, oxidation, and evaporation."
          },
          {
            "front": "What is the angel’s share?",
            "back": "Alcohol/water that evaporates through the barrel — ~2% per year in Scotland, more in hot climates."
          },
          {
            "front": "Main wood used for aging spirits",
            "back": "Oak — usually American white oak or European oak."
          },
          {
            "front": "Where does bourbon’s vanilla note come from?",
            "back": "Vanillin extracted from new charred oak."
          },
          {
            "front": "Why use used casks?",
            "back": "To let the base spirit’s character show and add subtler sherry/bourbon notes."
          }
        ],
        "quiz": [
          {
            "q": "Bourbon must be aged in:",
            "options": [
              "Any oak barrel",
              "New charred oak containers",
              "Ex-sherry casks"
            ],
            "correct": 1,
            "explanation": "By US law, bourbon uses new charred oak — usually American white oak."
          },
          {
            "q": "Vanilla notes in whisky mainly come from:",
            "options": [
              "The grain",
              "Vanillin in oak",
              "Added flavoring"
            ],
            "correct": 1,
            "explanation": "Vanillin is naturally extracted from the wood."
          },
          {
            "q": "In a hot climate, barrels tend to lose more:",
            "options": [
              "Water",
              "Alcohol",
              "Sugar"
            ],
            "correct": 0,
            "explanation": "Heat drives out water faster, which can actually raise the ABV in the barrel."
          },
          {
            "q": "Older whisky is:",
            "options": [
              "Always better",
              "Not automatically better",
              "Illegal after 20 years"
            ],
            "correct": 1,
            "explanation": "Over-aging can strip freshness and add bitterness."
          },
          {
            "q": "Which is NOT what happens in a barrel?",
            "options": [
              "Extraction of wood compounds",
              "Fermentation restart",
              "Slow oxidation"
            ],
            "correct": 1,
            "explanation": "Fermentation does not happen in the barrel — it’s already done."
          }
        ],
        "sources": [
          {
            "label": "Scotch Whisky Association",
            "url": "https://www.scotch-whisky.org.uk"
          },
          {
            "label": "US whisky standards, 27 CFR 5.143",
            "url": "https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-I/section-5.143"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "reading-spirit-labels",
        "title": "Reading Spirit Labels",
        "minutes": 4,
        "objectives": [
          "Decode ABV, age statement, and category on any label.",
          "Understand what \"single\", \"blended\" and \"cask strength\" mean.",
          "Spot marketing terms with no legal meaning."
        ],
        "theory": "Learning to read a label is a hospitality superpower. Every regulated spirit puts three things on it: **category, origin, and ABV.**\n\n- **Category** — e.g. \"Scotch whisky\", \"London Dry Gin\", \"Bourbon whiskey\", \"Tequila 100% de agave\". Each is legally defined and tells you the raw material, minimum ABV, and where it must be made.\n- **Origin** — many categories are geographically protected: Scotch must be made in Scotland, cognac in Cognac, tequila in specific Mexican states.\n- **ABV** — always in percent; sometimes also in proof.\n\nCommon strength-related terms:\n\n- **Cask strength / barrel proof** — bottled at whatever ABV came out of the barrel (often 55–65%), no dilution.\n- **Bottled in Bond** (US whiskey) — exactly 50% ABV, made in one season at one distillery, aged ≥4 years in a bonded warehouse.\n- **Navy Strength** (gin/rum) — conventionally about 57% ABV or more (not a legally defined term).\n\n\"Single\" vs \"blended\":\n\n- **Single malt** = malted barley + one distillery. **Single grain** = other grains + one distillery.\n- **Blended** = a blend from more than one distillery (or a blend of malt + grain whiskies, in Scotch).\n\nAge statements refer to the youngest spirit in the bottle. \"12 years old\" means nothing younger than 12.\n\nBeware marketing fluff: \"handcrafted\", \"small batch\", \"reserve\", \"artisanal\" and \"premium\" often have **no legal definition** in most countries.",
        "embedded": [
          {
            "q": "A \"12 Year Old\" Scotch means:",
            "options": [
              "The average age is 12",
              "The oldest whisky is 12",
              "The youngest whisky is 12"
            ],
            "correct": 2,
            "explanation": "Age statements always refer to the youngest liquid in the bottle."
          }
        ],
        "flashcards": [
          {
            "front": "Cask strength / barrel proof",
            "back": "Bottled at natural barrel ABV, no dilution."
          },
          {
            "front": "Bottled in Bond (US)",
            "back": "One distillery, one season, ≥4 yrs bonded, exactly 50% ABV."
          },
          {
            "front": "Navy Strength minimum ABV",
            "back": "About 57% ABV (industry convention, not law)."
          },
          {
            "front": "Single malt",
            "back": "Malted barley + one distillery."
          },
          {
            "front": "Blended Scotch",
            "back": "Blend of malt and grain whiskies from multiple distilleries."
          },
          {
            "front": "Do \"small batch\" and \"reserve\" have legal meaning?",
            "back": "Usually no — they are marketing terms."
          }
        ],
        "quiz": [
          {
            "q": "A single malt whisky must:",
            "options": [
              "Be from one country",
              "Come from a single distillery and use malted barley",
              "Be aged in new oak"
            ],
            "correct": 1,
            "explanation": "Single = one distillery; malt = 100% malted barley."
          },
          {
            "q": "Cask strength bottling means:",
            "options": [
              "Cut with water to 40% ABV",
              "Bottled at the ABV out of the barrel",
              "Aged longer than the age statement"
            ],
            "correct": 1,
            "explanation": "No water is added — usually 55–65% ABV."
          },
          {
            "q": "Bottled in Bond whiskey is bottled at:",
            "options": [
              "40% ABV",
              "50% ABV",
              "57% ABV"
            ],
            "correct": 1,
            "explanation": "Exactly 100 proof = 50% ABV."
          },
          {
            "q": "The label says \"Small Batch Reserve\". This is:",
            "options": [
              "A legal quality guarantee",
              "Marketing language with no strict definition",
              "A protected European term"
            ],
            "correct": 1,
            "explanation": "Neither term is legally defined in most countries."
          },
          {
            "q": "A blend of malt + grain whiskies from many distilleries is called:",
            "options": [
              "Single malt",
              "Blended Scotch",
              "Pure malt"
            ],
            "correct": 1,
            "explanation": "That is the definition of Blended Scotch Whisky."
          }
        ],
        "sources": [
          {
            "label": "EU Regulation 2019/787 on spirit drinks (consolidated)",
            "url": "https://eur-lex.europa.eu/eli/reg/2019/787/oj"
          },
          {
            "label": "US standards of identity for distilled spirits, 27 CFR Part 5 Subpart I",
            "url": "https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-I"
          },
          {
            "label": "The Scotch Whisky Regulations 2009",
            "url": "https://www.legislation.gov.uk/uksi/2009/2890/contents"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      }
    ]
  },
  {
    "slug": "whiskey-beginner",
    "title": "Whiskey",
    "tagline": "Scotch, Irish, Bourbon, Rye — the four cornerstones.",
    "level": "Beginner",
    "accent": "from-amber-500 to-orange-600",
    "icon": "GlassWater",
    "lessons": [
      {
        "slug": "what-is-whiskey",
        "title": "What Is Whiskey?",
        "minutes": 4,
        "objectives": [
          "Define whiskey and its universal legal requirements.",
          "Explain the difference between \"whisky\" and \"whiskey\".",
          "Recognize the four main whiskey styles."
        ],
        "theory": "Whiskey is, at its heart, a very simple idea: **a distilled spirit made from fermented grain and aged in wooden casks.** Everything else — country, grain mix, still, cask — is variation on that theme.\n\nUniversally, to legally call something whiskey a producer must:\n\n- Ferment a mash of **cereal grains** (barley, corn, rye, wheat).\n- Distill below about 95% ABV (EU: under 94.8%; US: under 95%) so grain character survives.\n- **Age in oak casks** (minimum times vary: Scotland/Ireland 3 years, US as little as 0 for corn whiskey but typically 2+ years).\n- Bottle at **minimum 40% ABV** (in the EU, US, Canada).\n\nThe spelling is regional:\n\n- **Whisky** — Scotland, Canada, Japan.\n- **Whiskey** — Ireland, United States (most brands).\n\nThe four traditional beginner styles are:\n\n- **Scotch** — made in Scotland; often malted barley; can be smoky.\n- **Irish** — made in Ireland; typically triple-distilled and smooth.\n- **Bourbon** — American; corn-forward; sweet vanilla and caramel.\n- **Rye** — American (or Canadian); rye-forward; spicier, drier.\n\nEach style tastes different because of the **grain, water, still, cask, and climate** — not because of magic.",
        "embedded": [
          {
            "q": "Which is NOT a legal requirement of whiskey?",
            "options": [
              "Made from grain",
              "Aged in oak",
              "Distilled to 95%+ ABV"
            ],
            "correct": 2,
            "explanation": "Whiskey must be distilled below 95% ABV to preserve grain character."
          }
        ],
        "flashcards": [
          {
            "front": "Definition of whiskey",
            "back": "Distilled spirit from fermented grain, aged in wood."
          },
          {
            "front": "Whisky vs whiskey",
            "back": "Whisky: Scotland, Canada, Japan. Whiskey: Ireland, US."
          },
          {
            "front": "Global minimum bottling strength",
            "back": "40% ABV in most major markets."
          },
          {
            "front": "Four beginner whiskey styles",
            "back": "Scotch, Irish, Bourbon, Rye."
          },
          {
            "front": "Why not distill whiskey to 96% ABV?",
            "back": "It would strip grain flavor — that would be neutral spirit / vodka, not whiskey."
          }
        ],
        "quiz": [
          {
            "q": "Scotch is spelled:",
            "options": [
              "Whiskey",
              "Whisky",
              "Both are correct"
            ],
            "correct": 1,
            "explanation": "Scotland uses \"whisky\" without the e."
          },
          {
            "q": "The minimum ABV for whiskey in the EU/US is:",
            "options": [
              "30%",
              "40%",
              "50%"
            ],
            "correct": 1,
            "explanation": "40% ABV is the standard floor."
          },
          {
            "q": "Which whiskey style is corn-based?",
            "options": [
              "Scotch single malt",
              "Bourbon",
              "Irish pot still"
            ],
            "correct": 1,
            "explanation": "Bourbon must be at least 51% corn."
          },
          {
            "q": "Whiskey must be aged in:",
            "options": [
              "Steel tanks",
              "Wooden (usually oak) casks",
              "Glass demijohns"
            ],
            "correct": 1,
            "explanation": "Oak is the universal aging vessel."
          },
          {
            "q": "Which country typically triple-distills its whiskey?",
            "options": [
              "Scotland",
              "Ireland",
              "USA"
            ],
            "correct": 1,
            "explanation": "Ireland is famous for its smooth, triple-distilled style."
          }
        ],
        "sources": [
          {
            "label": "EU Regulation 2019/787 on spirit drinks (consolidated)",
            "url": "https://eur-lex.europa.eu/eli/reg/2019/787/oj"
          },
          {
            "label": "US whisky standards, 27 CFR 5.143",
            "url": "https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-I/section-5.143"
          },
          {
            "label": "The Scotch Whisky Regulations 2009",
            "url": "https://www.legislation.gov.uk/uksi/2009/2890/contents"
          },
          {
            "label": "Irish Whiskey Act 1980",
            "url": "https://www.irishstatutebook.ie/eli/1980/act/33/enacted/en/html"
          },
          {
            "label": "Canada, Food and Drug Regulations (C.R.C., c. 870), Canadian whisky",
            "url": "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._870/"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "irish-whiskey",
        "title": "Irish Whiskey",
        "minutes": 4,
        "objectives": [
          "Understand the smooth style of Irish whiskey.",
          "Distinguish single pot still, single malt, single grain, and blended.",
          "Know the minimum aging rule."
        ],
        "theory": "Irish whiskey is one of the oldest distilling traditions in the world. Its signature style is **smooth, light, and approachable** — the whiskey most often recommended to beginners.\n\nBy law, Irish whiskey must be:\n\n- Made and matured on the island of Ireland.\n- Distilled from a mash of malted and/or unmalted cereal grains.\n- Distilled to less than 94.8% ABV.\n- Aged at least **3 years in wooden casks** on the island.\n- Bottled at 40% ABV or higher.\n\nThere are four legal categories:\n\n- **Single Pot Still** — uniquely Irish. Made from a mix of malted and unmalted barley (at least 30% of each, plus up to 5% other cereals such as oats) in pot stills at one distillery. Creamy, spicy, full-bodied (e.g., Redbreast, Green Spot).\n- **Single Malt** — 100% malted barley from one distillery. Usually triple-distilled (e.g., Bushmills 10).\n- **Single Grain** — other grains (usually corn or wheat) from a single distillery, distilled in a column still. Lighter, fruitier.\n- **Blended Irish** — a blend of two or more of the above. This is the biggest category and includes Jameson, Tullamore D.E.W., and Powers.\n\n**Triple distillation** — running the spirit through the still three times instead of two — strips out heavier compounds and gives Irish whiskey its famous smoothness. Most Irish, but not all, is triple-distilled.",
        "embedded": [
          {
            "q": "What is Irish whiskey’s minimum aging time?",
            "options": [
              "1 year",
              "3 years",
              "5 years"
            ],
            "correct": 1,
            "explanation": "A minimum of 3 years in wood on the island of Ireland."
          }
        ],
        "flashcards": [
          {
            "front": "What is unique to Ireland?",
            "back": "Single Pot Still whiskey — malted + unmalted barley in pot stills."
          },
          {
            "front": "Typical Irish distillation count",
            "back": "Three times (triple distillation)."
          },
          {
            "front": "Minimum Irish whiskey age",
            "back": "3 years in wooden casks on the island of Ireland."
          },
          {
            "front": "Biggest-selling Irish whiskey brand",
            "back": "Jameson — a blended Irish whiskey."
          },
          {
            "front": "Signature style of Irish whiskey",
            "back": "Smooth, light, and approachable."
          }
        ],
        "quiz": [
          {
            "q": "Which category is unique to Ireland?",
            "options": [
              "Single Malt",
              "Single Pot Still",
              "Bourbon"
            ],
            "correct": 1,
            "explanation": "Single Pot Still (malted + unmalted barley) is Ireland’s signature."
          },
          {
            "q": "Most Irish whiskey is distilled:",
            "options": [
              "Once",
              "Twice",
              "Three times"
            ],
            "correct": 2,
            "explanation": "Triple distillation is the tradition."
          },
          {
            "q": "Where must Irish whiskey be aged?",
            "options": [
              "Anywhere in the EU",
              "On the island of Ireland",
              "Only in the Republic of Ireland"
            ],
            "correct": 1,
            "explanation": "The whole island — including Northern Ireland — counts."
          },
          {
            "q": "Jameson is what type of Irish whiskey?",
            "options": [
              "Single Malt",
              "Blended",
              "Single Grain"
            ],
            "correct": 1,
            "explanation": "It blends pot still and grain whiskies."
          },
          {
            "q": "Irish single grain whiskey is typically distilled in:",
            "options": [
              "Pot stills",
              "Column stills",
              "Alembics"
            ],
            "correct": 1,
            "explanation": "Column stills give the lighter, fruitier profile."
          }
        ],
        "sources": [
          {
            "label": "Irish Whiskey Act 1980",
            "url": "https://www.irishstatutebook.ie/eli/1980/act/33/enacted/en/html"
          },
          {
            "label": "Technical File for Irish Whiskey (Department of Agriculture, Food and the Marine, 2014; EU-registered geographical indication)"
          },
          {
            "label": "EU Regulation 2019/787 on spirit drinks (consolidated)",
            "url": "https://eur-lex.europa.eu/eli/reg/2019/787/oj"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "scotch-whisky",
        "title": "Scotch Whisky",
        "minutes": 5,
        "objectives": [
          "Understand the legal definition of Scotch.",
          "Distinguish the five categories of Scotch.",
          "Recognize the six main whisky regions of Scotland."
        ],
        "theory": "Scotch whisky is Scotland’s national drink and one of the UK’s most valuable food and drink exports. By UK law, Scotch must be:\n\n- Distilled and matured in Scotland.\n- Made from water and malted barley (other cereals allowed in some categories).\n- Aged at least **3 years in oak casks** of no more than 700 L.\n- Bottled at 40% ABV minimum.\n- No additives except water and caramel coloring (E150a).\n\nThe five legal categories are:\n\n- **Single Malt Scotch** — 100% malted barley, one distillery, pot still.\n- **Single Grain Scotch** — grain whisky from one distillery, usually column still.\n- **Blended Malt** — malt whiskies from multiple distilleries, no grain whisky.\n- **Blended Grain** — grain whiskies from multiple distilleries.\n- **Blended Scotch** — malt + grain whiskies from multiple distilleries. The largest by volume (Johnnie Walker, Chivas, Ballantine’s).\n\nThe law protects five regions (Highland, Lowland, Speyside, Islay and Campbeltown); the trade also talks about the Islands as a sixth, which legally is part of the Highlands. Each has a broad style:\n\n- **Speyside** — fruity, elegant (Glenfiddich, Glenlivet, Macallan).\n- **Highland** — wide range, often richer.\n- **Lowland** — light, floral (Auchentoshan).\n- **Islay** — smoky, peaty, medicinal (Laphroaig, Ardbeg, Lagavulin).\n- **Campbeltown** — briny, oily (Springbank).\n- **Islands** — varied, often coastal (Talisker, Highland Park).\n\nThe smoky flavor in Islay malts comes from drying malted barley over peat fires, which infuse the grain with phenols.",
        "embedded": [
          {
            "q": "Where do smoky, peaty flavors in Scotch come from?",
            "options": [
              "The barrel",
              "Drying barley over peat smoke",
              "A special yeast"
            ],
            "correct": 1,
            "explanation": "Peat smoke deposits phenols into the malted barley before mashing."
          }
        ],
        "flashcards": [
          {
            "front": "Minimum Scotch aging",
            "back": "3 years in oak casks in Scotland."
          },
          {
            "front": "Definition of Single Malt Scotch",
            "back": "100% malted barley, one distillery, pot still."
          },
          {
            "front": "Islay is famous for",
            "back": "Smoky, peaty whiskies (Laphroaig, Ardbeg, Lagavulin)."
          },
          {
            "front": "Speyside is famous for",
            "back": "Elegant, fruity whiskies (Glenfiddich, Macallan)."
          },
          {
            "front": "Additives allowed in Scotch",
            "back": "Only water and caramel coloring (E150a)."
          },
          {
            "front": "Largest Scotch category by volume",
            "back": "Blended Scotch (malt + grain)."
          }
        ],
        "quiz": [
          {
            "q": "How long must Scotch age at minimum?",
            "options": [
              "1 year",
              "3 years",
              "10 years"
            ],
            "correct": 1,
            "explanation": "Three years in oak in Scotland."
          },
          {
            "q": "Which region is famous for peaty whiskies?",
            "options": [
              "Speyside",
              "Islay",
              "Lowland"
            ],
            "correct": 1,
            "explanation": "Islay malts are heavily peated."
          },
          {
            "q": "Peat flavor is added:",
            "options": [
              "To the barrel",
              "To the yeast",
              "When drying malted barley"
            ],
            "correct": 2,
            "explanation": "Smoke phenols cling to the malt."
          },
          {
            "q": "Single malt Scotch must come from:",
            "options": [
              "One country",
              "One region",
              "One distillery"
            ],
            "correct": 2,
            "explanation": "One single distillery is required."
          },
          {
            "q": "Which is the biggest Scotch category worldwide?",
            "options": [
              "Single Malt",
              "Blended Scotch",
              "Single Grain"
            ],
            "correct": 1,
            "explanation": "Blended Scotch dominates in volume."
          }
        ],
        "sources": [
          {
            "label": "The Scotch Whisky Regulations 2009",
            "url": "https://www.legislation.gov.uk/uksi/2009/2890/contents"
          },
          {
            "label": "Scotch Whisky Association",
            "url": "https://www.scotch-whisky.org.uk"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "bourbon",
        "title": "Bourbon",
        "minutes": 4,
        "objectives": [
          "Learn the legal definition of bourbon.",
          "Explain the role of the mash bill.",
          "Recognize typical bourbon flavor notes."
        ],
        "theory": "Bourbon is America’s native whiskey. It doesn’t have to come from Kentucky, but the vast majority of it does. By US federal law, bourbon must be:\n\n- Made in the **United States**.\n- From a **mash bill of at least 51% corn**.\n- Distilled to no more than **80% ABV** (160 proof).\n- Entered into the barrel at no more than **62.5% ABV** (125 proof).\n- Aged in new, charred oak containers (in practice almost always American white oak).\n- Bottled at 40% ABV or more. No colouring or flavouring may be added.\n\nThere is **no minimum aging time** for it to be called bourbon — but to be called **Straight Bourbon** it must be aged at least 2 years; anything under 4 years must state its age on the label.\n\nThe **mash bill** is the recipe of grains that were fermented. The other grains alongside corn are usually rye (for spice) or wheat (for softness):\n\n- **High-rye bourbon** — spicier, bolder (Bulleit, Four Roses Single Barrel).\n- **Wheated bourbon** — rounder, sweeter (Maker’s Mark, Weller, Pappy Van Winkle).\n- **Traditional bourbon** — balanced (Buffalo Trace, Wild Turkey).\n\nBecause of the new charred oak and Kentucky’s hot summers, bourbon extracts wood compounds fast: you get **vanilla, caramel, coconut, brown sugar, and toasted spice**, often within just 4–8 years.",
        "embedded": [
          {
            "q": "Bourbon must contain at least how much corn?",
            "options": [
              "40%",
              "51%",
              "60%"
            ],
            "correct": 1,
            "explanation": "A bourbon mash bill must be at least 51% corn by law."
          },
          {
            "q": "Bourbon must be aged in:",
            "options": [
              "Any oak barrel",
              "New charred oak containers",
              "Ex-sherry casks"
            ],
            "correct": 1,
            "explanation": "New, charred oak is required. This is why old bourbon barrels get sold to Scotch and rum producers."
          }
        ],
        "flashcards": [
          {
            "front": "Minimum corn in a bourbon mash bill",
            "back": "51%."
          },
          {
            "front": "Barrel type required for bourbon",
            "back": "New, charred oak containers (usually American white oak)."
          },
          {
            "front": "Straight Bourbon minimum age",
            "back": "2 years."
          },
          {
            "front": "Wheated bourbon character",
            "back": "Softer, sweeter (Maker’s Mark, Weller)."
          },
          {
            "front": "Where can bourbon be made?",
            "back": "Anywhere in the USA (not only Kentucky)."
          },
          {
            "front": "Typical bourbon flavor notes",
            "back": "Vanilla, caramel, coconut, brown sugar, spice."
          }
        ],
        "quiz": [
          {
            "q": "Can bourbon be made outside Kentucky?",
            "options": [
              "No, only Kentucky",
              "Yes, anywhere in the USA",
              "Yes, anywhere in the world"
            ],
            "correct": 1,
            "explanation": "Anywhere in the US — but most is Kentucky."
          },
          {
            "q": "Maker’s Mark is a:",
            "options": [
              "High-rye bourbon",
              "Wheated bourbon",
              "Rye whiskey"
            ],
            "correct": 1,
            "explanation": "Its mash bill uses wheat instead of rye — softer profile."
          },
          {
            "q": "The maximum bourbon distillation proof is:",
            "options": [
              "125 proof",
              "160 proof",
              "190 proof"
            ],
            "correct": 1,
            "explanation": "160 proof (80% ABV)."
          },
          {
            "q": "The barrel must be:",
            "options": [
              "Reused",
              "New and charred",
              "Any wood"
            ],
            "correct": 1,
            "explanation": "New charred oak, by law."
          },
          {
            "q": "A high-rye bourbon tastes:",
            "options": [
              "Softer and sweeter",
              "Spicier and bolder",
              "Smokier"
            ],
            "correct": 1,
            "explanation": "Rye adds baking-spice notes."
          }
        ],
        "sources": [
          {
            "label": "US whisky standards, 27 CFR 5.143",
            "url": "https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-I/section-5.143"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "rye-whiskey",
        "title": "Rye Whiskey",
        "minutes": 4,
        "objectives": [
          "Explain what distinguishes rye whiskey from bourbon.",
          "Recognize typical rye flavor notes.",
          "Know the difference between American and Canadian rye."
        ],
        "theory": "Rye whiskey is bourbon’s spicier, drier cousin — the backbone of classic American cocktails like the Old Fashioned, Manhattan, and Sazerac.\n\nIn the **United States**, to be labeled rye whiskey, a spirit must be:\n\n- Made from a mash of **at least 51% rye**.\n- Distilled to no more than 80% ABV. Entered into the barrel at no more than 62.5% ABV.\n- Aged in **new charred oak** containers (same as bourbon).\n- Bottled at 40% ABV or more.\n\nStraight Rye must be aged at least 2 years. Rye grain contributes **spicy, peppery, herbal, and dry** flavors — the more rye, the drier and spicier. “Barely legal” ryes like Rittenhouse (51% rye) taste closer to bourbon; high-rye whiskies like Bulleit Rye (95% rye) or 100% rye bottlings are much more assertive.\n\nIn **Canada**, the term \"rye whisky\" is used loosely: a spirit can be labeled Canadian Rye even without much rye grain, because rye was historically the dominant grain. Canadian whisky is typically **blended, lighter, and smoother** than American rye — think Crown Royal, Canadian Club.\n\nRye had almost died out in the mid-20th century but roared back with the modern cocktail renaissance. If a bartender wants to “wake up” a classic recipe, rye is often the answer.",
        "embedded": [
          {
            "q": "US rye whiskey must be at least ___ rye.",
            "options": [
              "40%",
              "51%",
              "75%"
            ],
            "correct": 1,
            "explanation": "A minimum of 51% rye grain in the mash bill."
          }
        ],
        "flashcards": [
          {
            "front": "Minimum rye in US rye whiskey",
            "back": "51%."
          },
          {
            "front": "Signature flavor notes of rye",
            "back": "Spicy, peppery, herbal, dry."
          },
          {
            "front": "Classic cocktail that shines with rye",
            "back": "The Sazerac (and Old Fashioned / Manhattan)."
          },
          {
            "front": "Canadian rye vs American rye",
            "back": "Canadian \"rye\" doesn’t require 51% rye; usually lighter and blended."
          },
          {
            "front": "Straight Rye minimum age",
            "back": "2 years in new charred oak."
          }
        ],
        "quiz": [
          {
            "q": "Rye whiskey is typically:",
            "options": [
              "Sweeter than bourbon",
              "Spicier and drier than bourbon",
              "Smokier than Scotch"
            ],
            "correct": 1,
            "explanation": "Rye grain gives peppery, dry character."
          },
          {
            "q": "The Manhattan cocktail traditionally uses:",
            "options": [
              "Bourbon or rye",
              "Scotch",
              "Irish whiskey"
            ],
            "correct": 0,
            "explanation": "Rye is the classical choice; bourbon is a common modern substitute."
          },
          {
            "q": "US rye must be aged in:",
            "options": [
              "Used oak",
              "New charred oak",
              "Ex-cognac casks"
            ],
            "correct": 1,
            "explanation": "Same barrel rule as bourbon."
          },
          {
            "q": "Which is generally lighter?",
            "options": [
              "American rye",
              "Canadian whisky",
              "They are identical"
            ],
            "correct": 1,
            "explanation": "Canadian whisky tends to be blended and lighter."
          },
          {
            "q": "Straight Rye must be aged at least:",
            "options": [
              "3 months",
              "2 years",
              "10 years"
            ],
            "correct": 1,
            "explanation": "2 years — same as Straight Bourbon."
          }
        ],
        "sources": [
          {
            "label": "US whisky standards, 27 CFR 5.143",
            "url": "https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-I/section-5.143"
          },
          {
            "label": "Canada, Food and Drug Regulations (C.R.C., c. 870), Canadian whisky",
            "url": "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._870/"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      }
    ]
  },
  {
    "slug": "gin-beginner",
    "title": "Gin",
    "tagline": "Juniper, botanicals, and the world’s most flexible spirit.",
    "level": "Beginner",
    "accent": "from-emerald-500 to-teal-600",
    "icon": "Sparkles",
    "lessons": [
      {
        "slug": "what-is-gin",
        "title": "What Is Gin?",
        "minutes": 4,
        "objectives": [
          "Define gin and its one essential botanical.",
          "Understand how gin is made from neutral spirit.",
          "Recognize the main modern gin styles."
        ],
        "theory": "Gin is a **juniper-forward, botanical-flavored spirit** built on top of a neutral base. If it doesn’t taste primarily of juniper, it isn’t gin — the EU and US both agree on this.\n\nThe process is:\n\n- Start with a **neutral spirit** — usually a highly rectified grain or molasses spirit at ~96% ABV. On its own it is nearly flavorless, like vodka.\n- **Infuse or redistill** with botanicals. Juniper is mandatory; producers then add anywhere from 4 to 40 other botanicals — coriander, angelica, orris, citrus peels, cardamom, etc.\n- **Cut with water** down to bottling strength (37.5% ABV EU, 40% US).\n\nMain modern styles:\n\n- **London Dry** — the classic, dry style. All botanicals added during redistillation. No sweetening.\n- **Distilled Gin** — similar to London Dry but flavoring can be added after distillation.\n- Plymouth Gin — historic style from Plymouth, England, slightly earthier and softer (its EU geographical indication lapsed in 2015).\n- **Old Tom** — historic, slightly sweetened, rounder.\n- **Genever** — Dutch ancestor of gin; malt-based, richer, less juniper-driven.\n- **New Western / Contemporary** — modern craft gins where juniper is present but not dominant; think citrus-forward or floral gins.\n- Navy Strength — any style, bottled at about 57% ABV or more (an industry convention, not a legal category).\n\nGin is popular partly because **it is quick to bring to market: no aging** is required (though some gins are barrel-aged).",
        "embedded": [
          {
            "q": "The mandatory botanical in gin is:",
            "options": [
              "Coriander",
              "Juniper",
              "Cardamom"
            ],
            "correct": 1,
            "explanation": "Juniper is legally required and must be the dominant flavor."
          }
        ],
        "flashcards": [
          {
            "front": "Mandatory botanical in gin",
            "back": "Juniper — must be dominant."
          },
          {
            "front": "What does gin start as?",
            "back": "A near-neutral, high-purity spirit (~96% ABV)."
          },
          {
            "front": "Does gin need to be aged?",
            "back": "No — gin can be sold immediately after distillation."
          },
          {
            "front": "Common gin botanicals besides juniper",
            "back": "Coriander, angelica, orris root, citrus peels, cardamom."
          },
          {
            "front": "Genever vs London Dry (one line)",
            "back": "Genever is malt-based, richer, less juniper; London Dry is dry, juniper-led."
          }
        ],
        "quiz": [
          {
            "q": "Which is NOT a style of gin?",
            "options": [
              "London Dry",
              "Old Tom",
              "Islay"
            ],
            "correct": 2,
            "explanation": "Islay is a Scotch whisky region, not a gin style."
          },
          {
            "q": "Gin is built on top of a:",
            "options": [
              "Fermented grape must",
              "Neutral spirit",
              "Beer"
            ],
            "correct": 1,
            "explanation": "Nearly all modern gin starts with a very high-purity neutral spirit."
          },
          {
            "q": "Genever is:",
            "options": [
              "French",
              "Dutch",
              "German"
            ],
            "correct": 1,
            "explanation": "Genever is the traditional Dutch spirit that gin evolved from."
          },
          {
            "q": "Minimum EU bottling ABV for gin:",
            "options": [
              "30%",
              "37.5%",
              "40%"
            ],
            "correct": 1,
            "explanation": "EU sets the floor at 37.5% ABV."
          },
          {
            "q": "What defines a Navy Strength gin?",
            "options": [
              "Aged in oak",
              "≥ 57% ABV",
              "Made in Plymouth"
            ],
            "correct": 1,
            "explanation": "Navy Strength = about 57% ABV or higher, by convention."
          }
        ],
        "sources": [
          {
            "label": "EU Regulation 2019/787 on spirit drinks (consolidated)",
            "url": "https://eur-lex.europa.eu/eli/reg/2019/787/oj"
          },
          {
            "label": "US gin standard, 27 CFR 5.144",
            "url": "https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-I/section-5.144"
          },
          {
            "label": "The Spirits Business (2014), “Plymouth Gin to ditch its geographical indication”",
            "url": "https://www.thespiritsbusiness.com/2014/11/plymouth-gin-to-ditch-its-geographical-indication/"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "london-dry-gin",
        "title": "London Dry Gin",
        "minutes": 4,
        "objectives": [
          "Understand the legal requirements of London Dry.",
          "Recognize the taste profile and classic uses.",
          "Distinguish London Dry from Distilled Gin."
        ],
        "theory": "**London Dry** is the archetypal modern gin. Despite the name, it does not have to be made in London — the term is a legal style, not a geographic protection.\n\nBy EU and UK law, London Dry gin must:\n\n- Use a highly rectified base spirit distilled to at least **96% ABV**.\n- Redistill that base with **only natural botanicals**, added before or during the redistillation — no flavor additions afterwards.\n- Come off the still at **at least 70% ABV**.\n- Contain **no added sugar** (max 0.1 g/L).\n- Contain **no coloring**.\n- Have **juniper as the dominant flavor**.\n\nOnly water may be added after distillation to reach bottling strength.\n\nThe result is a **dry, clean, juniper-forward gin** with clear supporting notes of citrus and coriander. Beefeater, Tanqueray, Bombay Sapphire, and Sipsmith are classic examples.\n\nBecause of its clean profile, London Dry is the go-to gin for a **Gin & Tonic**, a **Dry Martini**, or a **Negroni**. It plays well with quinine, vermouth, and Campari because it has no residual sweetness of its own.\n\n**Distilled Gin** looks similar on the shelf but is a looser category: you may add flavors after distillation, and small amounts of sugar are allowed. If a producer wants creative freedom, they choose Distilled Gin; if they want the classic guarantee, they choose London Dry.",
        "embedded": [
          {
            "q": "London Dry gin can be sweetened after distillation.",
            "options": [
              "True",
              "False"
            ],
            "correct": 1,
            "explanation": "No added sugar (max 0.1 g/L). London Dry is a dry style."
          }
        ],
        "flashcards": [
          {
            "front": "Does London Dry have to be made in London?",
            "back": "No — it is a style, not a location."
          },
          {
            "front": "Max sugar in London Dry",
            "back": "0.1 g/L — effectively none."
          },
          {
            "front": "Botanical rule in London Dry",
            "back": "All botanicals added before or during redistillation; nothing after."
          },
          {
            "front": "Base spirit purity for London Dry",
            "back": "Redistilled from a base spirit at ≥ 96% ABV."
          },
          {
            "front": "Classic cocktails for London Dry",
            "back": "Gin & Tonic, Dry Martini, Negroni."
          }
        ],
        "quiz": [
          {
            "q": "London Dry gin must be:",
            "options": [
              "Made in London",
              "Sweetened",
              "Free of added sugar and color"
            ],
            "correct": 2,
            "explanation": "No sugar, no color, all flavor from redistillation."
          },
          {
            "q": "When must botanicals be added?",
            "options": [
              "Before or during redistillation",
              "After distillation",
              "Only after aging"
            ],
            "correct": 0,
            "explanation": "Post-distillation flavor additions are forbidden."
          },
          {
            "q": "The dominant flavor must be:",
            "options": [
              "Citrus",
              "Juniper",
              "Coriander"
            ],
            "correct": 1,
            "explanation": "Juniper must lead — that’s the whole definition of gin."
          },
          {
            "q": "Distilled Gin differs from London Dry because it:",
            "options": [
              "Cannot use juniper",
              "Can be flavored after distillation",
              "Must be aged in oak"
            ],
            "correct": 1,
            "explanation": "Distilled Gin allows post-distillation flavoring; London Dry does not."
          },
          {
            "q": "Which is a classic London Dry brand?",
            "options": [
              "Tanqueray",
              "Jameson",
              "Cointreau"
            ],
            "correct": 0,
            "explanation": "Tanqueray is a benchmark London Dry."
          }
        ],
        "sources": [
          {
            "label": "EU Regulation 2019/787 on spirit drinks (consolidated)",
            "url": "https://eur-lex.europa.eu/eli/reg/2019/787/oj"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "old-tom-gin",
        "title": "Old Tom Gin",
        "minutes": 4,
        "objectives": [
          "Understand the history of Old Tom gin.",
          "Recognize its slightly sweet, rounded profile.",
          "Know which classic cocktails it belongs in."
        ],
        "theory": "**Old Tom** is a bridge between the malty, sweet **Genever** of the 1600s and the crisp **London Dry** of the 19th century. In 18th-century London, gin was harsh and often unsafe. To make it drinkable, producers began sweetening it — hence “Old Tom.”\n\nTradition links the name to wooden black-cat signs (“Old Tom”) hung on London walls; customers dropped a coin in a slot and a shot of gin was dispensed through a lead pipe. The style faded as drier London Dry gin took over in the late 19th century, and Prohibition then hit the American cocktail culture that used it; it was revived in the 2000s.\n\nBotanically, Old Tom is similar to London Dry, but with two key differences:\n\n- **Slightly sweetened** — modest sugar or licorice adds body.\n- **Softer, rounder** botanical profile — juniper is still present but less aggressive.\n\nModern Old Toms (Hayman’s, Ransom, Jensen’s) are essential for **historic cocktails** where London Dry now feels too dry:\n\n- Tom Collins — whose name is often linked to Old Tom (its origin is debated).\n- **Martinez** — the sweeter ancestor of the Martini.\n- **Ramos Gin Fizz** — the extra body helps the classic New Orleans texture.\n\nOld Tom is a great teaching example that “gin” is a family of styles, not a single flavor.",
        "embedded": [
          {
            "q": "Compared to London Dry, Old Tom is:",
            "options": [
              "Drier",
              "Slightly sweeter",
              "Much smokier"
            ],
            "correct": 1,
            "explanation": "Old Tom sits between Genever and London Dry — lightly sweetened."
          }
        ],
        "flashcards": [
          {
            "front": "Where does Old Tom sit historically?",
            "back": "Between Dutch Genever and modern London Dry."
          },
          {
            "front": "Signature difference from London Dry",
            "back": "Slightly sweetened, softer, rounder."
          },
          {
            "front": "Cocktail named after Old Tom",
            "back": "The Tom Collins (traditionally; the name’s origin is debated)."
          },
          {
            "front": "Another classic that calls for Old Tom",
            "back": "The Martinez."
          },
          {
            "front": "Why did Old Tom nearly die?",
            "back": "London Dry took over, then Prohibition hit the cocktail culture that used it."
          }
        ],
        "quiz": [
          {
            "q": "Old Tom gin is:",
            "options": [
              "Aged 10+ years",
              "Slightly sweetened",
              "Higher in juniper than London Dry"
            ],
            "correct": 1,
            "explanation": "Its defining trait is a touch of sweetness."
          },
          {
            "q": "The Tom Collins uses:",
            "options": [
              "London Dry only",
              "Old Tom traditionally",
              "Vodka"
            ],
            "correct": 1,
            "explanation": "Originally an Old Tom cocktail."
          },
          {
            "q": "Old Tom is closer in style to:",
            "options": [
              "Genever",
              "Rum",
              "Mezcal"
            ],
            "correct": 0,
            "explanation": "It is the historical bridge from Genever to London Dry."
          },
          {
            "q": "The Martinez is the ancestor of:",
            "options": [
              "The Manhattan",
              "The Martini",
              "The Margarita"
            ],
            "correct": 1,
            "explanation": "A sweeter forerunner of the Dry Martini."
          },
          {
            "q": "Old Tom gin nearly disappeared because of:",
            "options": [
              "World War I",
              "Prohibition",
              "A juniper shortage"
            ],
            "correct": 1,
            "explanation": "The rise of London Dry and then US Prohibition pushed it out of fashion."
          }
        ],
        "sources": [
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          },
          {
            "label": "Difford's Guide (gin styles)",
            "url": "https://www.diffordsguide.com"
          },
          {
            "label": "Wondrich, D., Imbibe!, 2nd ed., TarcherPerigee, 2015"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "navy-strength-gin",
        "title": "Navy Strength Gin",
        "minutes": 3,
        "objectives": [
          "Define Navy Strength and its minimum ABV.",
          "Understand its historical origin.",
          "Know when to reach for it behind the bar."
        ],
        "theory": "“Navy Strength” is not a separate style — it is a **strength category**. By convention, gins bottled at about 57% ABV or higher are labeled Navy Strength — the term has no legal definition.\n\nThe traditional origin story is naval (historians treat parts of it as legend): British Royal Navy ships carried gin (and rum) alongside gunpowder in the ship’s hold. If a barrel leaked into the gunpowder, the powder had to still ignite. Only spirits above roughly 57% ABV would allow soaked powder to burn — that’s the historical “proof.” 57.15% ABV equals 100° on the old British proof scale — that is where the number comes from.\n\nWhy does this matter at the bar today?\n\n- **Bolder flavor.** Higher ABV means botanicals push harder through mixers, so a Navy Strength gin cuts through tonic, citrus, or heavy cocktails without disappearing.\n- **Cocktail integrity.** In stirred drinks like a Martini, Navy Strength can give a bigger, drier profile.\n- **Distinct label cues.** Classic examples: **Plymouth Navy Strength**, **Hayman’s Royal Dock**, **Perry’s Tot**.\n\nRemember: Navy Strength is a strength; the underlying style (London Dry, Old Tom, Contemporary) is separate. A brand may make both a standard London Dry and a Navy Strength London Dry from the same botanicals.",
        "embedded": [
          {
            "q": "Minimum ABV to call a gin “Navy Strength”:",
            "options": [
              "40%",
              "50%",
              "57%"
            ],
            "correct": 2,
            "explanation": "57% ABV (historically 57.15%) is the threshold."
          }
        ],
        "flashcards": [
          {
            "front": "Navy Strength minimum ABV",
            "back": "57%."
          },
          {
            "front": "Is Navy Strength a style?",
            "back": "No — it’s a strength category. The style (e.g., London Dry) is separate."
          },
          {
            "front": "Origin of the 57% threshold",
            "back": "Above ~57%, gunpowder soaked in spirit could still ignite — the naval \"proof\"."
          },
          {
            "front": "A classic Navy Strength gin",
            "back": "Plymouth Navy Strength or Hayman’s Royal Dock."
          },
          {
            "front": "Why use it behind the bar?",
            "back": "It stands up to strong mixers and citrus without getting lost."
          }
        ],
        "quiz": [
          {
            "q": "Navy Strength gin must be at least:",
            "options": [
              "40%",
              "48%",
              "57% ABV"
            ],
            "correct": 2,
            "explanation": "57% ABV — the naval proof threshold."
          },
          {
            "q": "The “proof” threshold came from:",
            "options": [
              "Wine casks leaking",
              "Powder still igniting when spirit-soaked",
              "Naval officers’ preference"
            ],
            "correct": 1,
            "explanation": "Above ~57% ABV, wet gunpowder can still burn."
          },
          {
            "q": "Navy Strength is:",
            "options": [
              "A style like London Dry",
              "A strength category",
              "A distillery"
            ],
            "correct": 1,
            "explanation": "Style and strength are independent."
          },
          {
            "q": "Why use it in a G&T?",
            "options": [
              "To make a lower-alcohol drink",
              "So the gin isn’t washed out by tonic",
              "To reduce cost"
            ],
            "correct": 1,
            "explanation": "More ABV = more botanical presence in the finished drink."
          },
          {
            "q": "Which of these is Navy Strength?",
            "options": [
              "Beefeater 40%",
              "Plymouth Navy Strength 57%",
              "Bombay Sapphire 40%"
            ],
            "correct": 1,
            "explanation": "Only bottlings at 57%+ qualify."
          }
        ],
        "sources": [
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          },
          {
            "label": "Difford's Guide, Plymouth gin",
            "url": "https://www.diffordsguide.com/g/1108/gin/plymouth-gin"
          }
        ],
        "contentRev": "2026-11-16"
      },
      {
        "slug": "botanical-families",
        "title": "Botanical Families",
        "minutes": 4,
        "objectives": [
          "Group common gin botanicals into flavor families.",
          "Predict a gin’s style by reading its botanicals.",
          "Understand the role of juniper as the anchor."
        ],
        "theory": "Every gin, from bone-dry to floral, is built from a small palette of **botanical families**. Understanding these families lets you predict how a gin will taste before you smell it.\n\n**1. Juniper (mandatory).** Piney, resinous, slightly citrus. The anchor of gin.\n\n**2. Coriander seed.** Lemony, warm, slightly nutty. Second most common botanical. Adds brightness.\n\n**3. Roots & rhizomes** (angelica root, orris root, licorice). These are structural: they don’t give big flavors on their own but bind and support the other botanicals — like a spice cabinet’s salt.\n\n**4. Citrus peel** (lemon, orange, grapefruit, bergamot). Fresh, oily, aromatic. Modern gins often lean heavily here.\n\n**5. Warm spices** (cardamom, cassia, cinnamon, nutmeg, pepper, cubeb). Add depth and heat. Common in Contemporary and Navy Strength gins.\n\n**6. Florals** (rose, chamomile, elderflower, lavender). Add lightness and perfume. A signature of many modern craft gins.\n\n**7. Local/wild ingredients** (seaweed, tea, honeysuckle, olives, tomato leaf). Increasingly used to make a gin taste of a place.\n\nA quick heuristic:\n\n- Heavy on juniper + coriander + roots → classic London Dry.\n- Heavy on citrus + florals + light juniper → Contemporary / New Western.\n- Malt/genever notes → Genever (or some historically styled Old Toms).\n\nIn most gins, botanicals are redistilled with the spirit (either steeped in the pot or hung in a botanical basket for vapor infusion), which extracts their oils while leaving the neutral base clean.",
        "embedded": [
          {
            "q": "Which family provides the “structure” without a big taste of its own?",
            "options": [
              "Citrus peel",
              "Roots and rhizomes",
              "Florals"
            ],
            "correct": 1,
            "explanation": "Angelica, orris and licorice bind and support other flavors — like seasoning glue."
          }
        ],
        "flashcards": [
          {
            "front": "The 7 core botanical families in gin",
            "back": "Juniper, coriander, roots, citrus, warm spices, florals, local/wild."
          },
          {
            "front": "Role of orris root",
            "back": "A fixative — it holds and binds other aromas together."
          },
          {
            "front": "Second most common gin botanical",
            "back": "Coriander seed."
          },
          {
            "front": "Typical botanicals of a Contemporary gin",
            "back": "Citrus peel + florals with lighter juniper."
          },
          {
            "front": "How are botanicals usually added?",
            "back": "Redistilled with the spirit — steeped or in a vapor basket."
          }
        ],
        "quiz": [
          {
            "q": "The anchor botanical of all gin is:",
            "options": [
              "Angelica",
              "Juniper",
              "Cardamom"
            ],
            "correct": 1,
            "explanation": "Juniper is legally required and must dominate."
          },
          {
            "q": "Angelica and orris root are examples of:",
            "options": [
              "Florals",
              "Warm spices",
              "Roots and rhizomes"
            ],
            "correct": 2,
            "explanation": "They are fixative roots that bind other flavors."
          },
          {
            "q": "Citrus-forward, floral, low juniper gins are usually:",
            "options": [
              "London Dry",
              "Contemporary / New Western",
              "Genever"
            ],
            "correct": 1,
            "explanation": "That profile defines the modern Contemporary style."
          },
          {
            "q": "Cardamom is a:",
            "options": [
              "Root",
              "Warm spice",
              "Floral"
            ],
            "correct": 1,
            "explanation": "It falls in the warm spices family."
          },
          {
            "q": "Botanicals typically flavor gin by being:",
            "options": [
              "Bottled with the finished gin",
              "Redistilled with the base spirit",
              "Added as syrup after"
            ],
            "correct": 1,
            "explanation": "Redistillation extracts essential oils cleanly."
          }
        ],
        "sources": [
          {
            "label": "Knoll, A., Gin: The Art and Craft of the Artisan Revival, Jacqui Small, 2015"
          },
          {
            "label": "Wondrich, D. & Rothbaum, N. (eds.), The Oxford Companion to Spirits and Cocktails, Oxford University Press, 2021"
          }
        ],
        "contentRev": "2026-11-16"
      }
    ]
  }
];

export function getCourse(slug) {
  return COURSES.find((c) => c.slug === slug) || null;
}

export function getLesson(courseSlug, lessonSlug) {
  const c = getCourse(courseSlug);
  if (!c) return null;
  const idx = c.lessons.findIndex((l) => l.slug === lessonSlug);
  if (idx === -1) return null;
  const lesson = c.lessons[idx];
  const next = c.lessons[idx + 1] || null;
  const prev = c.lessons[idx - 1] || null;
  return { course: { slug: c.slug, title: c.title, accent: c.accent }, lesson, next, prev, index: idx, total: c.lessons.length };
}

export function allLessonPointers() {
  const arr = [];
  for (const c of COURSES) {
    for (const l of c.lessons) arr.push({ courseSlug: c.slug, lessonSlug: l.slug, title: l.title, courseTitle: c.title });
  }
  return arr;
}
