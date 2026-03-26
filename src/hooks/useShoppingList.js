export function useShoppingList() {
  return {
    shoppingList: [],
    loading: true,
    error: null,
    refreshShoppingList: async () => {},
  }
}
