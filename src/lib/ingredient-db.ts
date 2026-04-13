/**
 * Ingredient intelligence layer for skincare products.
 * Maps common skincare actives to their properties and provides
 * analysis functions for matching against Open Beauty Facts data.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IngredientInfo {
  name: string;
  inci: string[];
  good_for: string[];
  bad_for: string[];
  function: string;
  category: "active" | "base" | "preservative" | "fragrance" | "other";
  common_allergen: boolean;
  comedogenic_rating: 0 | 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface IngredientAnalysis {
  matched: { ingredient: string; info: IngredientInfo }[];
  unmatched: string[];
  skin_fit: Record<string, number>;
  concerns_addressed: string[];
  warnings: string[];
  has_fragrance: boolean;
  has_alcohol: boolean;
  comedogenic_score: number;
}

// ---------------------------------------------------------------------------
// Ingredient Database (~100 entries)
// ---------------------------------------------------------------------------

export const INGREDIENT_DB: IngredientInfo[] = [
  // ── Acids ───────────────────────────────────────────────────────────────
  {
    name: "Salicylic Acid",
    inci: ["SALICYLIC ACID", "BETA HYDROXY ACID", "BHA"],
    good_for: ["oily", "acne", "combination"],
    bad_for: ["dry", "sensitive"],
    function: "exfoliant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Oil-soluble BHA; penetrates pores to dissolve sebum plugs",
  },
  {
    name: "Glycolic Acid",
    inci: ["GLYCOLIC ACID"],
    good_for: ["aging", "hyperpigmentation", "oily", "acne"],
    bad_for: ["sensitive"],
    function: "exfoliant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Smallest AHA molecule; strongest penetration",
  },
  {
    name: "Lactic Acid",
    inci: ["LACTIC ACID"],
    good_for: ["dry", "aging", "hyperpigmentation", "sensitive"],
    bad_for: [],
    function: "exfoliant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Gentler AHA; also acts as a humectant",
  },
  {
    name: "Mandelic Acid",
    inci: ["MANDELIC ACID"],
    good_for: ["sensitive", "acne", "hyperpigmentation", "aging"],
    bad_for: [],
    function: "exfoliant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Large molecule AHA; gentlest of the AHAs",
  },
  {
    name: "Azelaic Acid",
    inci: ["AZELAIC ACID"],
    good_for: ["acne", "hyperpigmentation", "sensitive", "oily"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Antibacterial + anti-inflammatory; safe in pregnancy",
  },
  {
    name: "Hyaluronic Acid",
    inci: ["HYALURONIC ACID", "SODIUM HYALURONATE", "HYDROLYZED HYALURONIC ACID"],
    good_for: ["all", "dry", "dehydrated", "aging"],
    bad_for: [],
    function: "humectant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Holds up to 1000x its weight in water",
  },
  {
    name: "Vitamin C (Ascorbic Acid)",
    inci: [
      "ASCORBIC ACID",
      "L-ASCORBIC ACID",
      "ASCORBYL GLUCOSIDE",
      "SODIUM ASCORBYL PHOSPHATE",
      "ASCORBYL TETRAISOPALMITATE",
      "ETHYL ASCORBIC ACID",
      "3-O-ETHYL ASCORBIC ACID",
    ],
    good_for: ["hyperpigmentation", "aging", "all"],
    bad_for: ["sensitive"],
    function: "antioxidant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Brightening + collagen synthesis; unstable in pure form",
  },
  {
    name: "Kojic Acid",
    inci: ["KOJIC ACID", "KOJIC DIPALMITATE"],
    good_for: ["hyperpigmentation"],
    bad_for: ["sensitive"],
    function: "brightening",
    category: "active",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Tyrosinase inhibitor; can cause contact dermatitis",
  },
  {
    name: "Tranexamic Acid",
    inci: ["TRANEXAMIC ACID"],
    good_for: ["hyperpigmentation", "sensitive"],
    bad_for: [],
    function: "brightening",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Targets melasma and post-inflammatory hyperpigmentation",
  },
  {
    name: "Ferulic Acid",
    inci: ["FERULIC ACID"],
    good_for: ["aging", "all"],
    bad_for: [],
    function: "antioxidant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Stabilizes and boosts vitamin C and E",
  },

  // ── Retinoids ───────────────────────────────────────────────────────────
  {
    name: "Retinol",
    inci: ["RETINOL"],
    good_for: ["aging", "acne", "hyperpigmentation"],
    bad_for: ["sensitive", "dry"],
    function: "retinoid",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Gold standard anti-aging; start slow to build tolerance",
  },
  {
    name: "Retinal (Retinaldehyde)",
    inci: ["RETINAL", "RETINALDEHYDE"],
    good_for: ["aging", "acne", "hyperpigmentation"],
    bad_for: ["sensitive"],
    function: "retinoid",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "One conversion step from retinoic acid; faster results than retinol",
  },
  {
    name: "Tretinoin",
    inci: ["TRETINOIN", "RETINOIC ACID"],
    good_for: ["aging", "acne", "hyperpigmentation"],
    bad_for: ["sensitive", "dry"],
    function: "retinoid",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Prescription-strength retinoid; most effective but most irritating",
  },
  {
    name: "Adapalene",
    inci: ["ADAPALENE"],
    good_for: ["acne", "aging"],
    bad_for: ["sensitive", "dry"],
    function: "retinoid",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Synthetic retinoid; more stable and less irritating than tretinoin",
  },
  {
    name: "Bakuchiol",
    inci: ["BAKUCHIOL"],
    good_for: ["aging", "sensitive", "acne"],
    bad_for: [],
    function: "retinoid",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Plant-based retinol alternative; pregnancy-safe",
  },

  // ── Moisturizing / Barrier ──────────────────────────────────────────────
  {
    name: "Ceramides",
    inci: ["CERAMIDE NP", "CERAMIDE AP", "CERAMIDE EOP", "CERAMIDE NS", "CERAMIDE AS", "CERAMIDE 3", "CERAMIDE 6 II", "CERAMIDE 1"],
    good_for: ["all", "dry", "sensitive", "dehydrated"],
    bad_for: [],
    function: "emollient",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Lipids naturally found in skin barrier; repair and protect",
  },
  {
    name: "Squalane",
    inci: ["SQUALANE", "SQUALENE"],
    good_for: ["all", "dry", "dehydrated", "sensitive"],
    bad_for: [],
    function: "emollient",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Lightweight oil that mimics skin's natural sebum",
  },
  {
    name: "Glycerin",
    inci: ["GLYCERIN", "GLYCEROL"],
    good_for: ["all", "dry", "dehydrated"],
    bad_for: [],
    function: "humectant",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Urea",
    inci: ["UREA"],
    good_for: ["dry", "dehydrated"],
    bad_for: ["sensitive"],
    function: "humectant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "At low % (5-10) moisturizes; at higher % (20-40) exfoliates",
  },
  {
    name: "Panthenol",
    inci: ["PANTHENOL", "DEXPANTHENOL", "D-PANTHENOL", "PROVITAMIN B5"],
    good_for: ["all", "sensitive", "dry", "dehydrated"],
    bad_for: [],
    function: "humectant",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Provitamin B5; soothes, hydrates, and supports barrier repair",
  },
  {
    name: "Allantoin",
    inci: ["ALLANTOIN"],
    good_for: ["all", "sensitive", "dry"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Shea Butter",
    inci: ["BUTYROSPERMUM PARKII BUTTER", "BUTYROSPERMUM PARKII (SHEA) BUTTER", "SHEA BUTTER"],
    good_for: ["dry", "sensitive"],
    bad_for: ["oily", "acne"],
    function: "occlusive",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 2,
  },
  {
    name: "Jojoba Oil",
    inci: ["SIMMONDSIA CHINENSIS SEED OIL", "SIMMONDSIA CHINENSIS (JOJOBA) SEED OIL", "JOJOBA OIL"],
    good_for: ["all", "dry", "combination"],
    bad_for: [],
    function: "emollient",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 2,
    notes: "Technically a wax ester; closely mimics human sebum",
  },
  {
    name: "Dimethicone",
    inci: ["DIMETHICONE", "DIMETHICONE/VINYL DIMETHICONE CROSSPOLYMER"],
    good_for: ["all", "sensitive", "dry"],
    bad_for: [],
    function: "occlusive",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 1,
    notes: "Silicone; forms protective barrier without clogging pores",
  },

  // ── Antioxidants ────────────────────────────────────────────────────────
  {
    name: "Niacinamide",
    inci: ["NIACINAMIDE", "NICOTINAMIDE", "VITAMIN B3"],
    good_for: ["all", "oily", "acne", "hyperpigmentation", "aging", "sensitive"],
    bad_for: [],
    function: "antioxidant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Versatile; regulates sebum, brightens, strengthens barrier",
  },
  {
    name: "Vitamin E (Tocopherol)",
    inci: ["TOCOPHEROL", "TOCOPHERYL ACETATE", "ALPHA-TOCOPHEROL", "DL-ALPHA-TOCOPHERYL ACETATE"],
    good_for: ["all", "dry", "aging"],
    bad_for: [],
    function: "antioxidant",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 2,
    notes: "Fat-soluble antioxidant; synergistic with vitamin C",
  },
  {
    name: "Green Tea Extract",
    inci: ["CAMELLIA SINENSIS LEAF EXTRACT", "CAMELLIA SINENSIS EXTRACT", "GREEN TEA EXTRACT"],
    good_for: ["all", "oily", "acne", "aging"],
    bad_for: [],
    function: "antioxidant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Rich in EGCG polyphenols; anti-inflammatory",
  },
  {
    name: "Resveratrol",
    inci: ["RESVERATROL"],
    good_for: ["aging", "all"],
    bad_for: [],
    function: "antioxidant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Coenzyme Q10",
    inci: ["UBIQUINONE", "COENZYME Q10"],
    good_for: ["aging", "all"],
    bad_for: [],
    function: "antioxidant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Energizes skin cells; declines with age",
  },

  // ── Peptides ────────────────────────────────────────────────────────────
  {
    name: "Matrixyl (Palmitoyl Pentapeptide-4)",
    inci: ["PALMITOYL PENTAPEPTIDE-4", "PALMITOYL PENTAPEPTIDE-3", "MATRIXYL"],
    good_for: ["aging"],
    bad_for: [],
    function: "peptide",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Stimulates collagen and fibronectin production",
  },
  {
    name: "Copper Peptides",
    inci: ["COPPER TRIPEPTIDE-1", "GHK-CU"],
    good_for: ["aging", "acne"],
    bad_for: [],
    function: "peptide",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Promotes wound healing and collagen remodeling",
  },
  {
    name: "Argireline",
    inci: ["ACETYL HEXAPEPTIDE-3", "ACETYL HEXAPEPTIDE-8", "ARGIRELINE"],
    good_for: ["aging"],
    bad_for: [],
    function: "peptide",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Reduces appearance of expression lines; 'Botox in a jar'",
  },

  // ── Exfoliants ──────────────────────────────────────────────────────────
  {
    name: "Gluconolactone (PHA)",
    inci: ["GLUCONOLACTONE"],
    good_for: ["sensitive", "dry", "aging"],
    bad_for: [],
    function: "exfoliant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "PHA; gentlest chemical exfoliant; also a humectant",
  },
  {
    name: "Papain",
    inci: ["PAPAIN"],
    good_for: ["sensitive", "all"],
    bad_for: [],
    function: "exfoliant",
    category: "active",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Enzyme exfoliant from papaya; can cause reactions in latex-allergic individuals",
  },
  {
    name: "Bromelain",
    inci: ["BROMELAIN"],
    good_for: ["sensitive", "all"],
    bad_for: [],
    function: "exfoliant",
    category: "active",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Enzyme exfoliant from pineapple",
  },

  // ── Sunscreen Filters ──────────────────────────────────────────────────
  {
    name: "Zinc Oxide",
    inci: ["ZINC OXIDE"],
    good_for: ["all", "sensitive", "acne"],
    bad_for: [],
    function: "sunscreen",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Mineral/physical UV filter; broad-spectrum UVA + UVB",
  },
  {
    name: "Titanium Dioxide",
    inci: ["TITANIUM DIOXIDE", "CI 77891"],
    good_for: ["all", "sensitive"],
    bad_for: [],
    function: "sunscreen",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Mineral UV filter; primarily UVB protection",
  },
  {
    name: "Avobenzone",
    inci: ["AVOBENZONE", "BUTYL METHOXYDIBENZOYLMETHANE"],
    good_for: ["all"],
    bad_for: ["sensitive"],
    function: "sunscreen",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Chemical UVA filter; degrades in sunlight unless stabilized",
  },
  {
    name: "Octinoxate",
    inci: ["OCTINOXATE", "ETHYLHEXYL METHOXYCINNAMATE", "OCTYL METHOXYCINNAMATE"],
    good_for: ["all"],
    bad_for: ["sensitive"],
    function: "sunscreen",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Chemical UVB filter; potential endocrine disruptor; banned in Hawaii reefs",
  },

  // ── Soothing / Anti-inflammatory ────────────────────────────────────────
  {
    name: "Centella Asiatica",
    inci: [
      "CENTELLA ASIATICA EXTRACT",
      "MADECASSOSIDE",
      "ASIATICOSIDE",
      "CENTELLA ASIATICA LEAF EXTRACT",
      "CENTELLA ASIATICA",
    ],
    good_for: ["sensitive", "acne", "all"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Known as cica; promotes wound healing and calms redness",
  },
  {
    name: "Aloe Vera",
    inci: [
      "ALOE BARBADENSIS LEAF JUICE",
      "ALOE BARBADENSIS LEAF EXTRACT",
      "ALOE BARBADENSIS",
      "ALOE VERA",
    ],
    good_for: ["all", "sensitive", "dry"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Chamomile Extract",
    inci: [
      "CHAMOMILLA RECUTITA (MATRICARIA) FLOWER EXTRACT",
      "CHAMOMILLA RECUTITA FLOWER EXTRACT",
      "BISABOLOL",
      "CHAMOMILE EXTRACT",
    ],
    good_for: ["sensitive", "dry", "all"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "base",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Can cause reactions in people allergic to ragweed/daisies",
  },
  {
    name: "Bisabolol",
    inci: ["BISABOLOL", "ALPHA-BISABOLOL"],
    good_for: ["sensitive", "all"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Derived from chamomile; anti-irritant and skin-conditioning",
  },
  {
    name: "Colloidal Oatmeal",
    inci: ["AVENA SATIVA KERNEL FLOUR", "COLLOIDAL OATMEAL", "AVENA SATIVA (OAT) KERNEL FLOUR"],
    good_for: ["sensitive", "dry", "all"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "FDA-recognized skin protectant; soothes eczema and irritation",
  },
  {
    name: "Licorice Root Extract",
    inci: [
      "GLYCYRRHIZA GLABRA ROOT EXTRACT",
      "GLYCYRRHIZA GLABRA (LICORICE) ROOT EXTRACT",
      "LICORICE ROOT EXTRACT",
      "GLABRIDIN",
    ],
    good_for: ["sensitive", "hyperpigmentation", "all"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Contains glabridin; brightens and calms inflammation",
  },

  // ── Problematic Ingredients ─────────────────────────────────────────────
  {
    name: "Alcohol Denat",
    inci: ["ALCOHOL DENAT", "ALCOHOL DENAT.", "SD ALCOHOL", "DENATURED ALCOHOL", "ALCOHOL"],
    good_for: [],
    bad_for: ["dry", "sensitive", "dehydrated"],
    function: "solvent",
    category: "other",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Drying alcohol; can damage skin barrier at high concentrations",
  },
  {
    name: "Fragrance / Parfum",
    inci: ["FRAGRANCE", "PARFUM", "AROMA"],
    good_for: [],
    bad_for: ["sensitive", "acne"],
    function: "fragrance",
    category: "fragrance",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Umbrella term for undisclosed scent chemicals; top allergen",
  },
  {
    name: "Essential Oils (general)",
    inci: [
      "LAVANDULA ANGUSTIFOLIA OIL",
      "CITRUS LIMON PEEL OIL",
      "CITRUS AURANTIUM DULCIS PEEL OIL",
      "EUCALYPTUS GLOBULUS LEAF OIL",
      "MELALEUCA ALTERNIFOLIA LEAF OIL",
      "MENTHA PIPERITA OIL",
      "ROSMARINUS OFFICINALIS LEAF OIL",
      "LINALOOL",
      "LIMONENE",
      "CITRONELLOL",
      "GERANIOL",
      "EUGENOL",
    ],
    good_for: [],
    bad_for: ["sensitive"],
    function: "fragrance",
    category: "fragrance",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Common sensitizers; can cause photo-sensitivity (citrus oils)",
  },
  {
    name: "SLS (Sodium Lauryl Sulfate)",
    inci: ["SODIUM LAURYL SULFATE", "SLS"],
    good_for: [],
    bad_for: ["sensitive", "dry", "acne"],
    function: "surfactant",
    category: "other",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Harsh surfactant; strips natural oils",
  },
  {
    name: "SLES (Sodium Laureth Sulfate)",
    inci: ["SODIUM LAURETH SULFATE", "SLES"],
    good_for: [],
    bad_for: ["sensitive", "dry"],
    function: "surfactant",
    category: "other",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Milder than SLS but can still irritate sensitive skin",
  },
  {
    name: "Formaldehyde Releasers",
    inci: [
      "DMDM HYDANTOIN",
      "IMIDAZOLIDINYL UREA",
      "DIAZOLIDINYL UREA",
      "QUATERNIUM-15",
      "BRONOPOL",
      "2-BROMO-2-NITROPROPANE-1,3-DIOL",
    ],
    good_for: [],
    bad_for: ["sensitive", "all"],
    function: "preservative",
    category: "preservative",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Slowly release formaldehyde; known contact allergens",
  },

  // ── Common Allergens ────────────────────────────────────────────────────
  {
    name: "Lanolin",
    inci: ["LANOLIN", "LANOLIN ALCOHOL", "LANOLIN OIL"],
    good_for: ["dry"],
    bad_for: ["acne"],
    function: "occlusive",
    category: "base",
    common_allergen: true,
    comedogenic_rating: 3,
    notes: "Derived from sheep wool; excellent occlusive but common allergen",
  },
  {
    name: "Propylene Glycol",
    inci: ["PROPYLENE GLYCOL"],
    good_for: ["dry", "dehydrated"],
    bad_for: ["sensitive"],
    function: "humectant",
    category: "base",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Effective humectant; can irritate sensitive or eczema-prone skin",
  },
  {
    name: "Methylisothiazolinone",
    inci: ["METHYLISOTHIAZOLINONE", "MIT", "METHYLCHLOROISOTHIAZOLINONE"],
    good_for: [],
    bad_for: ["sensitive", "all"],
    function: "preservative",
    category: "preservative",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Potent preservative; one of the most common contact allergens",
  },
  {
    name: "Parabens",
    inci: [
      "METHYLPARABEN",
      "ETHYLPARABEN",
      "PROPYLPARABEN",
      "BUTYLPARABEN",
      "ISOBUTYLPARABEN",
    ],
    good_for: [],
    bad_for: ["sensitive"],
    function: "preservative",
    category: "preservative",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Effective preservatives; controversial due to weak estrogenic activity",
  },

  // ── Additional commonly seen ingredients ────────────────────────────────
  {
    name: "Water",
    inci: ["AQUA", "WATER", "EAU"],
    good_for: ["all"],
    bad_for: [],
    function: "solvent",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Cetearyl Alcohol",
    inci: ["CETEARYL ALCOHOL", "CETYL ALCOHOL", "STEARYL ALCOHOL"],
    good_for: ["dry", "all"],
    bad_for: [],
    function: "emollient",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 2,
    notes: "Fatty alcohol (not drying alcohol); thickener and emollient",
  },
  {
    name: "Phenoxyethanol",
    inci: ["PHENOXYETHANOL"],
    good_for: [],
    bad_for: [],
    function: "preservative",
    category: "preservative",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Common paraben-free preservative; generally well-tolerated",
  },
  {
    name: "Benzoyl Peroxide",
    inci: ["BENZOYL PEROXIDE"],
    good_for: ["acne", "oily"],
    bad_for: ["dry", "sensitive"],
    function: "antibacterial",
    category: "active",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Kills acne bacteria; can bleach fabric; very drying",
  },
  {
    name: "Sulfur",
    inci: ["SULFUR"],
    good_for: ["acne", "oily"],
    bad_for: ["dry", "sensitive"],
    function: "antibacterial",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Dries out blemishes; anti-fungal properties",
  },
  {
    name: "Tea Tree Oil",
    inci: ["MELALEUCA ALTERNIFOLIA LEAF OIL", "TEA TREE OIL"],
    good_for: ["acne", "oily"],
    bad_for: ["sensitive", "dry"],
    function: "antibacterial",
    category: "active",
    common_allergen: true,
    comedogenic_rating: 1,
    notes: "Natural antibacterial; must be diluted; can sensitize over time",
  },
  {
    name: "Arbutin",
    inci: ["ARBUTIN", "ALPHA-ARBUTIN"],
    good_for: ["hyperpigmentation"],
    bad_for: [],
    function: "brightening",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Tyrosinase inhibitor; gentler alternative to hydroquinone",
  },
  {
    name: "Hydroquinone",
    inci: ["HYDROQUINONE"],
    good_for: ["hyperpigmentation"],
    bad_for: ["sensitive"],
    function: "brightening",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Most potent brightener; prescription in many countries; not for long-term use",
  },
  {
    name: "Snail Mucin",
    inci: ["SNAIL SECRETION FILTRATE"],
    good_for: ["all", "dry", "aging", "acne"],
    bad_for: [],
    function: "humectant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Contains glycoproteins, glycolic acid, and hyaluronic acid naturally",
  },
  {
    name: "Rosehip Oil",
    inci: ["ROSA CANINA SEED OIL", "ROSA CANINA FRUIT OIL", "ROSEHIP OIL"],
    good_for: ["dry", "aging", "hyperpigmentation"],
    bad_for: ["oily", "acne"],
    function: "emollient",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 1,
    notes: "Rich in vitamin A and essential fatty acids",
  },
  {
    name: "Coconut Oil",
    inci: ["COCOS NUCIFERA OIL", "COCONUT OIL"],
    good_for: ["dry"],
    bad_for: ["oily", "acne", "combination"],
    function: "occlusive",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 4,
    notes: "Highly comedogenic; best for body rather than face",
  },
  {
    name: "Mineral Oil",
    inci: ["MINERAL OIL", "PARAFFINUM LIQUIDUM"],
    good_for: ["dry"],
    bad_for: ["oily", "acne"],
    function: "occlusive",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 2,
    notes: "Effective occlusive; cosmetic-grade is non-comedogenic for most",
  },
  {
    name: "Isopropyl Myristate",
    inci: ["ISOPROPYL MYRISTATE"],
    good_for: [],
    bad_for: ["oily", "acne"],
    function: "emollient",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 5,
    notes: "One of the most comedogenic ingredients; used as a penetration enhancer",
  },
  {
    name: "Ethylhexyl Palmitate",
    inci: ["ETHYLHEXYL PALMITATE"],
    good_for: [],
    bad_for: ["oily", "acne"],
    function: "emollient",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 4,
  },
  {
    name: "Sodium PCA",
    inci: ["SODIUM PCA"],
    good_for: ["all", "dry", "dehydrated"],
    bad_for: [],
    function: "humectant",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Part of skin's natural moisturizing factor (NMF)",
  },
  {
    name: "Betaine",
    inci: ["BETAINE"],
    good_for: ["all", "dry", "sensitive"],
    bad_for: [],
    function: "humectant",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Petrolatum",
    inci: ["PETROLATUM", "PETROLEUM JELLY"],
    good_for: ["dry", "sensitive"],
    bad_for: ["oily", "acne"],
    function: "occlusive",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Best occlusive available; locks in moisture; non-comedogenic despite reputation",
  },
  {
    name: "Zinc PCA",
    inci: ["ZINC PCA"],
    good_for: ["oily", "acne"],
    bad_for: [],
    function: "sebum-regulating",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Kaolin",
    inci: ["KAOLIN"],
    good_for: ["oily", "acne"],
    bad_for: ["dry"],
    function: "absorbent",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Clay mineral; absorbs excess oil",
  },
  {
    name: "Bentonite",
    inci: ["BENTONITE"],
    good_for: ["oily", "acne"],
    bad_for: ["dry", "sensitive"],
    function: "absorbent",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Swelling clay; draws out impurities",
  },
  {
    name: "Witch Hazel",
    inci: ["HAMAMELIS VIRGINIANA WATER", "HAMAMELIS VIRGINIANA EXTRACT", "WITCH HAZEL"],
    good_for: ["oily"],
    bad_for: ["dry", "sensitive"],
    function: "astringent",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Astringent; most commercial forms contain alcohol",
  },
  {
    name: "Saccharomyces Ferment Filtrate",
    inci: ["SACCHAROMYCES FERMENT FILTRATE", "GALACTOMYCES FERMENT FILTRATE"],
    good_for: ["all", "aging", "dry"],
    bad_for: [],
    function: "antioxidant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Yeast ferment; brightening and anti-aging (popular in K-beauty)",
  },
  {
    name: "Adenosine",
    inci: ["ADENOSINE"],
    good_for: ["aging", "all"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Anti-wrinkle; promotes collagen synthesis",
  },
  {
    name: "Ethylhexylglycerin",
    inci: ["ETHYLHEXYLGLYCERIN"],
    good_for: [],
    bad_for: [],
    function: "preservative",
    category: "preservative",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Preservative booster; often paired with phenoxyethanol",
  },
  {
    name: "EDTA",
    inci: ["DISODIUM EDTA", "TETRASODIUM EDTA"],
    good_for: [],
    bad_for: [],
    function: "chelating agent",
    category: "other",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Xanthan Gum",
    inci: ["XANTHAN GUM"],
    good_for: [],
    bad_for: [],
    function: "thickener",
    category: "other",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Carbomer",
    inci: ["CARBOMER"],
    good_for: [],
    bad_for: [],
    function: "thickener",
    category: "other",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Polysorbate 20",
    inci: ["POLYSORBATE 20"],
    good_for: [],
    bad_for: [],
    function: "emulsifier",
    category: "other",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Butylene Glycol",
    inci: ["BUTYLENE GLYCOL"],
    good_for: ["all", "dry"],
    bad_for: [],
    function: "humectant",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 1,
    notes: "Lightweight humectant and penetration enhancer",
  },
  {
    name: "Sodium Hyaluronate Crosspolymer",
    inci: ["SODIUM HYALURONATE CROSSPOLYMER"],
    good_for: ["all", "dry", "dehydrated"],
    bad_for: [],
    function: "humectant",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Cross-linked HA; longer-lasting hydration than regular HA",
  },
  {
    name: "Madecassic Acid",
    inci: ["MADECASSIC ACID"],
    good_for: ["sensitive", "acne"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Active compound from centella asiatica",
  },
  {
    name: "Asiatic Acid",
    inci: ["ASIATIC ACID"],
    good_for: ["sensitive", "aging"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Active compound from centella asiatica; promotes collagen synthesis",
  },
  {
    name: "Algae Extract",
    inci: ["ALGAE EXTRACT", "CHLORELLA VULGARIS EXTRACT", "SPIRULINA PLATENSIS EXTRACT"],
    good_for: ["all", "aging", "dry"],
    bad_for: [],
    function: "antioxidant",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Honey",
    inci: ["MEL", "HONEY", "MEL EXTRACT"],
    good_for: ["dry", "sensitive"],
    bad_for: [],
    function: "humectant",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Natural humectant with antibacterial properties",
  },
  {
    name: "Propolis",
    inci: ["PROPOLIS EXTRACT", "PROPOLIS"],
    good_for: ["acne", "sensitive"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Bee-derived; antibacterial; can trigger reactions in bee-allergic individuals",
  },
  {
    name: "Mugwort Extract",
    inci: ["ARTEMISIA VULGARIS EXTRACT", "ARTEMISIA PRINCEPS EXTRACT", "ARTEMISIA ANNUA EXTRACT"],
    good_for: ["sensitive", "acne"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: false,
    comedogenic_rating: 0,
    notes: "Popular K-beauty soothing ingredient",
  },
  {
    name: "Rice Bran Extract",
    inci: ["ORYZA SATIVA BRAN EXTRACT", "ORYZA SATIVA (RICE) BRAN EXTRACT"],
    good_for: ["all", "hyperpigmentation"],
    bad_for: [],
    function: "brightening",
    category: "base",
    common_allergen: false,
    comedogenic_rating: 0,
  },
  {
    name: "Turmeric Extract",
    inci: ["CURCUMA LONGA ROOT EXTRACT", "CURCUMA LONGA (TURMERIC) ROOT EXTRACT"],
    good_for: ["hyperpigmentation", "acne"],
    bad_for: [],
    function: "anti-inflammatory",
    category: "active",
    common_allergen: true,
    comedogenic_rating: 0,
    notes: "Can stain skin temporarily; potent anti-inflammatory",
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalise an ingredient string for comparison. */
function normalise(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build an inverted index from INCI names to IngredientInfo entries.
 * Done once at module load for fast lookup.
 */
function buildIndex(): Map<string, IngredientInfo> {
  const index = new Map<string, IngredientInfo>();
  for (const entry of INGREDIENT_DB) {
    for (const inci of entry.inci) {
      index.set(normalise(inci), entry);
    }
  }
  return index;
}

const INCI_INDEX = buildIndex();

/**
 * Try to match a raw ingredient string (from OBF) against the database.
 * Uses exact match on normalised INCI first, then substring matching.
 */
function matchIngredient(raw: string): IngredientInfo | null {
  const norm = normalise(raw);
  if (!norm) return null;

  // Exact match
  const exact = INCI_INDEX.get(norm);
  if (exact) return exact;

  // Check if any INCI key is contained within the raw string
  for (const [key, info] of INCI_INDEX) {
    if (key.length >= 4 && norm.includes(key)) return info;
  }

  // Check if the raw string is contained within any INCI key
  if (norm.length >= 4) {
    for (const [key, info] of INCI_INDEX) {
      if (key.includes(norm)) return info;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Analysis functions
// ---------------------------------------------------------------------------

const SKIN_TYPES_AND_CONCERNS = [
  "oily",
  "dry",
  "combination",
  "normal",
  "sensitive",
  "acne",
  "aging",
  "hyperpigmentation",
  "dehydrated",
];

const FRAGRANCE_INCI = new Set(["FRAGRANCE", "PARFUM", "AROMA"]);

const DRYING_ALCOHOL_INCI = new Set([
  "ALCOHOL DENAT",
  "ALCOHOL DENAT.",
  "SD ALCOHOL",
  "DENATURED ALCOHOL",
  "ALCOHOL",
]);

/**
 * Match OBF ingredient strings against the database and produce a
 * comprehensive analysis.
 */
export function analyzeIngredients(ingredients: string[]): IngredientAnalysis {
  const matched: IngredientAnalysis["matched"] = [];
  const unmatched: string[] = [];
  const seenNames = new Set<string>();

  for (const raw of ingredients) {
    const info = matchIngredient(raw);
    if (info) {
      if (!seenNames.has(info.name)) {
        seenNames.add(info.name);
        matched.push({ ingredient: raw, info });
      }
    } else {
      unmatched.push(raw);
    }
  }

  // Skin fit scoring
  const skin_fit: Record<string, number> = {};
  for (const key of SKIN_TYPES_AND_CONCERNS) {
    skin_fit[key] = 0;
  }

  for (const { info } of matched) {
    for (const g of info.good_for) {
      if (g === "all") {
        for (const key of SKIN_TYPES_AND_CONCERNS) {
          skin_fit[key] = (skin_fit[key] ?? 0) + 1;
        }
      } else if (skin_fit[g] !== undefined) {
        skin_fit[g] += 1;
      }
    }
    for (const b of info.bad_for) {
      if (b === "all") {
        for (const key of SKIN_TYPES_AND_CONCERNS) {
          skin_fit[key] = (skin_fit[key] ?? 0) - 2;
        }
      } else if (skin_fit[b] !== undefined) {
        skin_fit[b] -= 2;
      }
    }
  }

  // Clamp to -10..+10
  for (const key of Object.keys(skin_fit)) {
    skin_fit[key] = Math.max(-10, Math.min(10, skin_fit[key]));
  }

  // Concerns addressed
  const concernCounts = new Map<string, number>();
  for (const { info } of matched) {
    for (const g of info.good_for) {
      if (g !== "all") {
        concernCounts.set(g, (concernCounts.get(g) ?? 0) + 1);
      }
    }
  }
  const concerns_addressed = [...concernCounts.entries()]
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([concern]) => concern);

  // Warnings
  const warnings: string[] = [];

  const allergens = matched.filter(({ info }) => info.common_allergen);
  if (allergens.length > 0) {
    warnings.push(
      `Contains common allergens: ${allergens.map(({ info }) => info.name).join(", ")}`
    );
  }

  const highComedogenic = matched.filter(
    ({ info }) => info.comedogenic_rating >= 3
  );
  if (highComedogenic.length > 0) {
    warnings.push(
      `Highly comedogenic ingredients: ${highComedogenic.map(({ info }) => `${info.name} (${info.comedogenic_rating}/5)`).join(", ")}`
    );
  }

  // Check for conflicting actives
  const hasRetinoid = matched.some(({ info }) => info.function === "retinoid");
  const hasAHA = matched.some(
    ({ info }) =>
      info.function === "exfoliant" &&
      ["GLYCOLIC ACID", "LACTIC ACID", "MANDELIC ACID"].some((a) =>
        info.inci.includes(a)
      )
  );
  const hasBHA = matched.some(
    ({ info }) =>
      info.function === "exfoliant" &&
      info.inci.some((i) => i.includes("SALICYLIC"))
  );
  const hasVitC = matched.some(({ info }) =>
    info.inci.some((i) => i.includes("ASCORBIC"))
  );

  if (hasRetinoid && (hasAHA || hasBHA)) {
    warnings.push(
      "Contains retinoid + acid exfoliant — may cause excessive irritation if used together"
    );
  }
  if (hasRetinoid && hasVitC) {
    warnings.push(
      "Contains retinoid + vitamin C — can be irritating; consider using at different times of day"
    );
  }
  if (hasBHA && hasAHA) {
    warnings.push(
      "Contains both AHA + BHA — double exfoliation may be too strong for sensitive skin"
    );
  }

  // Fragrance / alcohol detection
  const has_fragrance = matched.some(({ info }) =>
    info.inci.some((i) => FRAGRANCE_INCI.has(i))
  );
  const has_alcohol = matched.some(({ info }) =>
    info.inci.some((i) => DRYING_ALCOHOL_INCI.has(i))
  );

  if (has_fragrance) {
    warnings.push("Contains fragrance/parfum — common irritant and allergen");
  }
  if (has_alcohol) {
    warnings.push("Contains drying alcohol — may compromise skin barrier");
  }

  // Comedogenic score (average of matched ingredients)
  const comedogenicIngredients = matched.filter(
    ({ info }) => info.comedogenic_rating > 0
  );
  const comedogenic_score =
    matched.length > 0
      ? Math.round(
          (matched.reduce((sum, { info }) => sum + info.comedogenic_rating, 0) /
            matched.length) *
            10
        ) / 10
      : 0;

  return {
    matched,
    unmatched,
    skin_fit,
    concerns_addressed,
    warnings,
    has_fragrance,
    has_alcohol,
    comedogenic_score,
  };
}

/**
 * Check if a product's ingredients conflict with a user's known allergies.
 * Returns an array of ingredient names that match the user's allergies.
 */
export function checkAllergens(
  ingredients: string[],
  allergies: string[]
): string[] {
  if (allergies.length === 0) return [];

  const normAllergies = allergies.map(normalise);
  const flagged: string[] = [];

  for (const raw of ingredients) {
    const norm = normalise(raw);
    const info = matchIngredient(raw);

    for (const allergy of normAllergies) {
      // Direct match on the raw ingredient string
      if (norm.includes(allergy) || allergy.includes(norm)) {
        flagged.push(raw);
        break;
      }
      // Match against known names in the database
      if (info && normalise(info.name).includes(allergy)) {
        flagged.push(raw);
        break;
      }
      // Match against INCI variants
      if (info) {
        const inciMatch = info.inci.some(
          (i) =>
            normalise(i).includes(allergy) || allergy.includes(normalise(i))
        );
        if (inciMatch) {
          flagged.push(raw);
          break;
        }
      }
    }
  }

  return [...new Set(flagged)];
}

/**
 * Score how well a product fits a skin profile.
 * Returns a number from -10 to +10 where positive means good fit.
 */
export function scoreSkinFit(
  analysis: IngredientAnalysis,
  skinType: string,
  concerns: string[]
): number {
  let score = 0;
  let factors = 0;

  // Base score from skin type fit
  const typeScore = analysis.skin_fit[skinType.toLowerCase()];
  if (typeScore !== undefined) {
    score += typeScore * 2; // Weight skin type match more heavily
    factors += 2;
  }

  // Score from concern matches
  for (const concern of concerns) {
    const concernScore = analysis.skin_fit[concern.toLowerCase()];
    if (concernScore !== undefined) {
      score += concernScore;
      factors += 1;
    }
  }

  // Penalty for warnings
  score -= analysis.warnings.length * 0.5;

  // Penalty for high comedogenic score (especially for oily/acne skin)
  if (
    skinType.toLowerCase() === "oily" ||
    concerns.some((c) => c.toLowerCase() === "acne")
  ) {
    score -= analysis.comedogenic_score * 2;
  } else {
    score -= analysis.comedogenic_score * 0.5;
  }

  // Penalty for fragrance/alcohol for sensitive skin
  if (skinType.toLowerCase() === "sensitive") {
    if (analysis.has_fragrance) score -= 2;
    if (analysis.has_alcohol) score -= 2;
  }

  // Bonus if product addresses multiple concerns
  const addressedOverlap = concerns.filter((c) =>
    analysis.concerns_addressed.includes(c.toLowerCase())
  ).length;
  score += addressedOverlap * 0.5;

  // Normalise to -10..+10
  if (factors > 0) {
    score = score / Math.max(factors, 1);
  }

  return Math.round(Math.max(-10, Math.min(10, score)) * 10) / 10;
}
