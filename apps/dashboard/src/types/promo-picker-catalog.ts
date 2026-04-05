export type PromoPickerCategory = {
  id: string;
  name: string;
  fullURLPath: string;
  parentId: string | null;
  departmentId: string;
};

export type PromoPickerItem = {
  id: string;
  name: string;
  watchlistText: string;
  fullURLPath: string;
  parentCategoryId: string;
  departmentId: string;
  retailerCategoryId?: string;
  productCount?: number;
};

export type PromoPickerCatalog = {
  schemaVersion: number;
  retailer: string;
  meta: {
    generatedAt: string;
    description?: string;
    sources?: string[];
  };
  categories: PromoPickerCategory[];
  items: PromoPickerItem[];
};
