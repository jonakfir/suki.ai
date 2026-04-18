"use client";

import { create } from "zustand";

export type SkinType = "oily" | "dry" | "combination" | "normal" | "sensitive";
export type SkinTone = "fair" | "light" | "medium" | "tan" | "deep";
export type AgeRange = "teens" | "20s" | "30s" | "40s" | "50+";
export type Budget = "drugstore" | "mid-range" | "luxury" | "mixed";
export type RoutineComplexity = "minimal" | "moderate" | "full";
export type ProductCategory =
  // skincare
  | "cleanser"
  | "toner"
  | "serum"
  | "moisturizer"
  | "sunscreen"
  | "exfoliant"
  | "mask"
  | "eye_cream"
  | "oil"
  | "treatment"
  | "other"
  // haircare
  | "shampoo"
  | "conditioner"
  | "hair_mask"
  | "hair_oil"
  | "hair_styling"
  | "scalp_treatment"
  | "heat_protectant"
  | "leave_in"
  // makeup
  | "foundation"
  | "concealer"
  | "powder"
  | "blush"
  | "bronzer"
  | "highlighter"
  | "lipstick"
  | "lip_gloss"
  | "lip_liner"
  | "eyeshadow"
  | "eyeliner"
  | "mascara"
  | "brow"
  | "primer"
  | "setting_spray"
  | "makeup_remover";
export type ProductRating = "love" | "neutral" | "bad_reaction";

export type ProductDomain = "skincare" | "haircare" | "makeup";
export type HairType = "straight" | "wavy" | "curly" | "coily";
export type HairTexture = "fine" | "medium" | "thick";
export type HairPorosity = "low" | "medium" | "high";
export type MakeupStyle = "natural" | "everyday" | "bold" | "glam" | "editorial";
export type CoveragePreference = "sheer" | "medium" | "full";
export type FinishPreference = "matte" | "natural" | "dewy" | "glossy";
export type Undertone = "warm" | "cool" | "neutral" | "olive";
export type PreferenceMode = "budget" | "simple" | "high_end" | "most_recommended";

export const SKINCARE_CATEGORIES: ProductCategory[] = [
  "cleanser",
  "toner",
  "serum",
  "moisturizer",
  "sunscreen",
  "exfoliant",
  "mask",
  "eye_cream",
  "oil",
  "treatment",
  "other",
];

export const HAIRCARE_CATEGORIES: ProductCategory[] = [
  "shampoo",
  "conditioner",
  "hair_mask",
  "hair_oil",
  "hair_styling",
  "scalp_treatment",
  "heat_protectant",
  "leave_in",
];

export const MAKEUP_CATEGORIES: ProductCategory[] = [
  "foundation",
  "concealer",
  "powder",
  "blush",
  "bronzer",
  "highlighter",
  "lipstick",
  "lip_gloss",
  "lip_liner",
  "eyeshadow",
  "eyeliner",
  "mascara",
  "brow",
  "primer",
  "setting_spray",
  "makeup_remover",
];

export function domainForCategory(c: ProductCategory): ProductDomain {
  if (HAIRCARE_CATEGORIES.includes(c)) return "haircare";
  if (MAKEUP_CATEGORIES.includes(c)) return "makeup";
  return "skincare";
}

export interface SkinProfile {
  skin_type: SkinType | null;
  skin_concerns: string[];
  skin_tone: SkinTone | null;
  age_range: AgeRange | null;
  known_allergies: string[];
  budget: Budget | null;
  routine_complexity: RoutineComplexity | null;
  // hair
  hair_type?: HairType | null;
  hair_texture?: HairTexture | null;
  hair_porosity?: HairPorosity | null;
  hair_concerns?: string[];
  hair_goals?: string[];
  is_color_treated?: boolean;
  // makeup
  makeup_style?: MakeupStyle | null;
  coverage_preference?: CoveragePreference | null;
  finish_preference?: FinishPreference | null;
  undertone?: Undertone | null;
  // preference
  preference_mode?: PreferenceMode;
}

export interface UserProduct {
  id: string;
  product_name: string;
  brand: string;
  category: ProductCategory;
  domain?: ProductDomain;
  rating: ProductRating;
  notes: string;
  is_current: boolean;
  ingredients: string[];
  created_at: string;
  is_saved?: boolean;
  image_url?: string;
  barcode?: string;
  shade_name?: string;
  shade_hex?: string;
  shade_finish?: string;
}

export interface ProductSuggestion {
  name: string;
  brand: string;
  category: string;
  reason: string;
  price_range?: string;
  where_to_buy?: string;
  key_ingredients?: string[];
  budget_tier?: string;
  complexity_impact?: string;
  buy_url?: string | null;
  image_url?: string | null;
}

export interface Recommendation {
  id: string;
  type: "add" | "avoid";
  product_suggestion: ProductSuggestion;
  generated_at: string;
  is_dismissed: boolean;
}

interface AppState {
  profile: SkinProfile;
  products: UserProduct[];
  recommendations: Recommendation[];
  onboardingStep: number;
  isLoading: boolean;

  setProfile: (profile: Partial<SkinProfile>) => void;
  setProducts: (products: UserProduct[]) => void;
  addProduct: (product: UserProduct) => void;
  updateProduct: (id: string, updates: Partial<UserProduct>) => void;
  removeProduct: (id: string) => void;
  setRecommendations: (recs: Recommendation[]) => void;
  dismissRecommendation: (id: string) => void;
  setOnboardingStep: (step: number) => void;
  setLoading: (loading: boolean) => void;
  resetUserData: () => void;
}

const emptyProfile: SkinProfile = {
  skin_type: null,
  skin_concerns: [],
  skin_tone: null,
  age_range: null,
  known_allergies: [],
  budget: null,
  routine_complexity: null,
  hair_type: null,
  hair_texture: null,
  hair_porosity: null,
  hair_concerns: [],
  hair_goals: [],
  is_color_treated: false,
  makeup_style: null,
  coverage_preference: null,
  finish_preference: null,
  undertone: null,
  preference_mode: "most_recommended",
};

export const useStore = create<AppState>((set) => ({
  profile: emptyProfile,
  products: [],
  recommendations: [],
  onboardingStep: 1,
  isLoading: false,

  setProfile: (profile) =>
    set((state) => ({ profile: { ...state.profile, ...profile } })),
  setProducts: (products) => set({ products }),
  addProduct: (product) =>
    set((state) => ({ products: [product, ...state.products] })),
  updateProduct: (id, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
  setRecommendations: (recommendations) => set({ recommendations }),
  dismissRecommendation: (id) =>
    set((state) => ({
      recommendations: state.recommendations.map((r) =>
        r.id === id ? { ...r, is_dismissed: true } : r
      ),
    })),
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
  setLoading: (isLoading) => set({ isLoading }),
  resetUserData: () =>
    set({
      profile: emptyProfile,
      products: [],
      recommendations: [],
      onboardingStep: 1,
    }),
}));
