import { PriceRangeKey, PriceSort } from '@/components/SearchFilterSheet';

export interface FilterState {
  categoryIds: string[];
  priceSort: PriceSort;
  byRating: boolean;
  priceRange: PriceRangeKey | null;
  onlyDiscounted: boolean;
  filterOpen: boolean;
}

export type FilterAction =
  | { type: 'TOGGLE_CATEGORY'; id: string }
  | { type: 'SET_PRICE_SORT'; value: PriceSort }
  | { type: 'SET_BY_RATING'; value: boolean }
  | { type: 'SET_PRICE_RANGE'; value: PriceRangeKey | null }
  | { type: 'SET_ONLY_DISCOUNTED'; value: boolean }
  | { type: 'OPEN_FILTER' }
  | { type: 'CLOSE_FILTER' }
  | { type: 'CLEAR_SORT' }
  | { type: 'RESET_ALL' };

export const FILTER_INIT: FilterState = {
  categoryIds: [],
  priceSort: null,
  byRating: false,
  priceRange: null,
  onlyDiscounted: false,
  filterOpen: false,
};

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'TOGGLE_CATEGORY':
      return {
        ...state,
        categoryIds: state.categoryIds.includes(action.id)
          ? state.categoryIds.filter((x) => x !== action.id)
          : [...state.categoryIds, action.id],
      };
    case 'SET_PRICE_SORT':
      return { ...state, priceSort: action.value };
    case 'SET_BY_RATING':
      return { ...state, byRating: action.value };
    case 'SET_PRICE_RANGE':
      return { ...state, priceRange: action.value };
    case 'SET_ONLY_DISCOUNTED':
      return { ...state, onlyDiscounted: action.value };
    case 'OPEN_FILTER':
      return { ...state, filterOpen: true };
    case 'CLOSE_FILTER':
      return { ...state, filterOpen: false };
    case 'CLEAR_SORT':
      return { ...state, priceSort: null, byRating: false };
    case 'RESET_ALL':
      return FILTER_INIT;
    default:
      return state;
  }
}
