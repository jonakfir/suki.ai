"use client";

import { create } from "zustand";

export type SkinType = "oily" | "dry" | "combination" | "normal" | "sensitive";
export type SkinTone = "fair" | "light" | "medium" | "tan" | "deep";
export type AgeRange = "teens" | "20s" | "30s" | "40s" | "50+";
export type Budget = "drugstore" | "mid-range" | "luxury" | "mixed";
export type RoutineComplexity = "minimal" | "moderate" | "full";
export type ProductCategory =
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
  | "other";
export type ProductRating = "love" | "neutral" | "bad_reaction";

export interface SkinProfile {
  skin_type: SkinType | null;
  skin_concerns: string[];
  skin_tone: SkinTone | null;
  age_range: AgeRange | null;
  known_allergies: string[];
  budget: Budget | null;
  routine_complexity: RoutineComplexity | null;
}

export interface UserProduct {
  id: string;
  product_name: string;
  brand: string;
  category: ProductCategory;
  rating: ProductRating;
  notes: string;
  is_current: boolean;
  ingredients: string[];
  created_at: string;
}

export interface Recommendation {
  id: string;
  type: "add" | "avoid";
  product_suggestion: {
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
  };
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
