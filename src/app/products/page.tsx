"use client";

import { useEffect, useState } from "react";
import { useStore, UserProduct, ProductCategory, ProductRating } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { Pill } from "@/components/ui/Pill";
import { Modal } from "@/components/ui/Modal";
import { FormInput, FormTextarea } from "@/components/ui/FormInput";
import { FadeIn } from "@/components/ui/FadeIn";
import { PageHero } from "@/components/ui/PageHero";
import {
  Plus,
  Search,
  Heart,
  Meh,
  AlertTriangle,
  Trash2,
  Edit3,
  Package,
  Sparkles,
  Loader2,
} from "lucide-react";

interface CatalogHit {
  product_name: string;
  brand: string;
  category: string;
  ingredients: string[];
  price_range: string;
  description: string;
}

const categories: ProductCategory[] = [
  "cleanser", "toner", "serum", "moisturizer", "sunscreen",
  "exfoliant", "mask", "eye_cream", "oil", "treatment", "other",
];

const ratings: { value: ProductRating; label: string; icon: typeof Heart }[] = [
  { value: "love", label: "Love it", icon: Heart },
  { value: "neutral", label: "Neutral", icon: Meh },
  { value: "bad_reaction", label: "Bad reaction", icon: AlertTriangle },
];

interface ProductForm {
  product_name: string;
  brand: string;
  category: ProductCategory;
  rating: ProductRating;
  notes: string;
  is_current: boolean;
  ingredients: string;
}

const emptyForm: ProductForm = {
  product_name: "",
  brand: "",
  category: "other",
  rating: "neutral",
  notes: "",
  is_current: false,
  ingredients: "",
};

export default function ProductsPage() {
  const { products, setProducts, addProduct, updateProduct, removeProduct } = useStore();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<ProductCategory | "all">("all");
  const [filterRating, setFilterRating] = useState<ProductRating | "all">("all");
  const [filterSaved, setFilterSaved] = useState(false);
  const [togglingSaveId, setTogglingSaveId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<CatalogHit[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("filter") === "saved") setFilterSaved(true);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/auth";
            return;
          }
          throw new Error(`Load failed (${res.status})`);
        }
        const body = await res.json();
        setProducts((body.products ?? []) as UserProduct[]);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setLookupQuery("");
    setLookupResults([]);
    setLookupError("");
    setSaveError("");
    setModalOpen(true);
  };

  const runLookup = async () => {
    const q = lookupQuery.trim();
    if (q.length < 2) return;
    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Search failed (${res.status})`);
      setLookupResults((body.products ?? []) as CatalogHit[]);
      if ((body.products ?? []).length === 0) {
        setLookupError("No matches — fill the form in manually.");
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Search failed");
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const pickLookupResult = (hit: CatalogHit) => {
    const validCat = (categories as string[]).includes(hit.category)
      ? (hit.category as ProductCategory)
      : "other";
    setForm((f) => ({
      ...f,
      product_name: hit.product_name,
      brand: hit.brand,
      category: validCat,
      ingredients: hit.ingredients.join(", "),
    }));
    setLookupResults([]);
    setLookupQuery("");
  };

  const openEdit = (p: UserProduct) => {
    setForm({
      product_name: p.product_name,
      brand: p.brand,
      category: p.category,
      rating: p.rating,
      notes: p.notes,
      is_current: p.is_current,
      ingredients: p.ingredients.join(", "),
    });
    setEditingId(p.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    const payload = {
      product_name: form.product_name,
      brand: form.brand,
      category: form.category,
      rating: form.rating,
      notes: form.notes,
      is_current: form.is_current,
      ingredients: form.ingredients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        const res = await fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `Update failed (${res.status})`);
        if (body.product) {
          updateProduct(editingId, body.product as Partial<UserProduct>);
        }
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `Add failed (${res.status})`);
        if (body.product) addProduct(body.product as UserProduct);
      }
      setModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSave = async (p: UserProduct) => {
    if (togglingSaveId === p.id) return;
    const next = !p.is_saved;
    setTogglingSaveId(p.id);
    updateProduct(p.id, { is_saved: next });
    try {
      const res = next
        ? await fetch("/api/products/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: p.id }),
          })
        : await fetch("/api/products/save", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: p.id }),
          });
      if (!res.ok) {
        updateProduct(p.id, { is_saved: !next });
      }
    } catch (err) {
      console.error("Toggle save failed:", err);
      updateProduct(p.id, { is_saved: !next });
    } finally {
      setTogglingSaveId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) removeProduct(id);
      else console.error("Delete failed", await res.text());
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCat === "all" || p.category === filterCat;
    const matchesRating = filterRating === "all" || p.rating === filterRating;
    const matchesSaved = !filterSaved || p.is_saved === true;
    return matchesSearch && matchesCat && matchesRating && matchesSaved;
  });

  return (
    <div>
      <PageHero
        eyebrow="Your library"
        title={<>Product</>}
        titleAccent="log."
        subtitle="Everything that's touched your skin — saved, tried, and everything in between."
        actions={
          <GhostButton variant="filled" onClick={openAdd}>
            <Plus size={16} />
            Add product
          </GhostButton>
        }
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

      {/* Saved / All tabs */}
      <FadeIn delay={0.08}>
        <div className="flex gap-1 mb-3 sm:mb-4 p-1 bg-card rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setFilterSaved(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer ${
              filterSaved
                ? "bg-background text-accent shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Heart size={14} className={filterSaved ? "fill-accent text-accent" : ""} />
            Saved
          </button>
          <button
            onClick={() => setFilterSaved(false)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer ${
              !filterSaved
                ? "bg-background text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            All
          </button>
        </div>
      </FadeIn>

      {/* Filters */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value as ProductCategory | "all")}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value as ProductRating | "all")}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="all">All ratings</option>
            {ratings.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </FadeIn>

      {/* Product List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : filtered.length === 0 ? (
        <FadeIn>
          <div className="text-center py-20">
            <Package size={48} className="text-muted/30 mx-auto mb-4" />
            <h3 className="text-lg font-light mb-1">No products yet</h3>
            <p className="text-sm text-muted font-[family-name:var(--font-body)] mb-4">
              Start building your skin diary by adding your first product.
            </p>
            <GhostButton variant="outline" onClick={openAdd}>
              <Plus size={16} />
              Add your first product
            </GhostButton>
          </div>
        </FadeIn>
      ) : (
        <div className="divide-y divide-card-border/40 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-4 border-y border-card-border/40 sm:border-0">
          {filtered.map((p) => (
            <FadeIn key={p.id}>
              <ProductRow
                product={p}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p.id)}
                onToggleSave={() => handleToggleSave(p)}
                toggling={togglingSaveId === p.id}
              />
            </FadeIn>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit product" : "Add a product"}
      >
        <div className="space-y-4">
          {!editingId && (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-accent">
                <Sparkles size={14} />
                Search the catalog
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. cerave moisturizer"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runLookup();
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <GhostButton
                  size="sm"
                  variant="outline"
                  onClick={runLookup}
                  disabled={lookupLoading || lookupQuery.trim().length < 2}
                >
                  {lookupLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  {lookupLoading ? "Searching" : "Find"}
                </GhostButton>
              </div>
              {lookupError && (
                <p className="text-xs text-muted font-[family-name:var(--font-body)]">{lookupError}</p>
              )}
              {lookupResults.length > 0 && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {lookupResults.map((hit, i) => (
                    <button
                      key={i}
                      onClick={() => pickLookupResult(hit)}
                      className="w-full text-left p-2.5 rounded-xl border border-card-border hover:border-accent/40 hover:bg-accent/5 transition-colors"
                    >
                      <p className="text-sm font-medium">{hit.product_name}</p>
                      <p className="text-xs text-muted font-[family-name:var(--font-body)]">
                        {hit.brand} &middot; {hit.category.replace("_", " ")} &middot; {hit.price_range}
                      </p>
                      {hit.description && (
                        <p className="text-xs text-muted/80 mt-1 font-[family-name:var(--font-body)]">
                          {hit.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <FormInput
            label="Product name"
            placeholder="e.g. Hydrating Cleanser"
            value={form.product_name}
            onChange={(e) => setForm({ ...form, product_name: e.target.value })}
            required
          />
          <FormInput
            label="Brand"
            placeholder="e.g. CeraVe"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as ProductCategory })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Rating</label>
              <div className="flex gap-1">
                {ratings.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setForm({ ...form, rating: r.value })}
                    className={`flex-1 py-2.5 rounded-xl text-xs border transition-all cursor-pointer ${
                      form.rating === r.value
                        ? r.value === "love"
                          ? "border-accent bg-accent/10 text-accent"
                          : r.value === "bad_reaction"
                            ? "border-red-300 bg-red-50 text-red-500"
                            : "border-accent bg-accent/5 text-foreground"
                        : "border-border hover:border-accent/30"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <FormTextarea
            label="Notes (optional)"
            placeholder="How did it feel? Any reactions?"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <FormInput
            label="Key ingredients (comma-separated)"
            placeholder="e.g. Hyaluronic acid, Ceramides, Niacinamide"
            value={form.ingredients}
            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={(e) => setForm({ ...form, is_current: e.target.checked })}
              className="rounded border-border accent-accent"
            />
            Currently in my routine
          </label>
          {saveError && (
            <p className="text-sm text-red-500 font-[family-name:var(--font-body)] break-words">
              {saveError}
            </p>
          )}
          <GhostButton
            variant="filled"
            className="w-full"
            onClick={handleSave}
            disabled={saving || !form.product_name || !form.brand}
          >
            {saving ? "Saving..." : editingId ? "Update product" : "Add product"}
          </GhostButton>
        </div>
      </Modal>
      </div>
    </div>
  );
}

function ProductRow({
  product: p,
  onEdit,
  onDelete,
  onToggleSave,
  toggling,
}: {
  product: UserProduct;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSave: () => void;
  toggling: boolean;
}) {
  const saved = p.is_saved === true;
  return (
    <>
      {/* Mobile: compact row. Desktop: card. */}
      <div className="flex items-center gap-3 py-2.5 sm:hidden">
        <RatingBadge rating={p.rating} />
        <div className="flex-1 min-w-0" onClick={onEdit} role="button" tabIndex={0}>
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-medium truncate">{p.product_name}</p>
            {p.is_current && (
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent" aria-label="current" />
            )}
          </div>
          <p className="text-[11px] text-muted font-[family-name:var(--font-body)] truncate">
            {p.brand} · {p.category.replace("_", " ")}
          </p>
        </div>
        <button
          onClick={onToggleSave}
          disabled={toggling}
          aria-label={saved ? "Unsave" : "Save"}
          className={`p-1.5 transition-colors ${saved ? "text-accent" : "text-muted/70 hover:text-accent"}`}
        >
          <Heart size={13} className={saved ? "fill-accent" : ""} />
        </button>
        <button
          onClick={onEdit}
          aria-label="Edit"
          className="p-1.5 text-muted/70 hover:text-foreground transition-colors"
        >
          <Edit3 size={13} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          className="p-1.5 text-muted/70 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="hidden sm:block relative paper-grain bg-card/80 backdrop-blur-sm border border-card-border/60 rounded-2xl p-5 hover:shadow-[0_8px_30px_rgba(91,155,213,0.12)] transition-all">
        <button
          onClick={onToggleSave}
          disabled={toggling}
          aria-label={saved ? "Unsave" : "Save to shelf"}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full border backdrop-blur-sm flex items-center justify-center transition-colors ${
            saved
              ? "bg-accent/15 border-accent/40 text-accent"
              : "bg-background/80 border-border/60 text-muted hover:text-accent"
          }`}
        >
          <Heart size={14} className={saved ? "fill-accent" : ""} />
        </button>
        <div className="flex items-start justify-between gap-2 pr-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-sm font-medium truncate">{p.product_name}</h3>
              {p.is_current && (
                <span className="shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                  Current
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted font-[family-name:var(--font-body)] truncate">
              {p.brand} · {p.category.replace("_", " ")}
            </p>
            {p.notes && (
              <p className="text-[11px] text-muted mt-1.5 font-[family-name:var(--font-body)] line-clamp-2">
                {p.notes}
              </p>
            )}
            {p.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {p.ingredients.slice(0, 3).map((ing) => (
                  <Pill key={ing} className="!text-[9px] !px-1.5 !py-0.5">
                    {ing}
                  </Pill>
                ))}
                {p.ingredients.length > 3 && (
                  <span className="text-[9px] text-muted self-center">
                    +{p.ingredients.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <RatingBadge rating={p.rating} />
            <button
              onClick={onEdit}
              aria-label="Edit"
              className="p-1.5 text-muted hover:text-foreground transition-colors"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={onDelete}
              aria-label="Delete"
              className="p-1.5 text-muted hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function RatingBadge({ rating }: { rating: ProductRating }) {
  switch (rating) {
    case "love":
      return (
        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-accent/10 flex items-center justify-center">
          <Heart size={14} className="text-accent fill-accent" />
        </span>
      );
    case "neutral":
      return (
        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-card flex items-center justify-center">
          <Meh size={14} className="text-muted" />
        </span>
      );
    case "bad_reaction":
      return (
        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={14} className="text-red-400" />
        </span>
      );
  }
}
