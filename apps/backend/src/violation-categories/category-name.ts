export function normalizeCategoryName(name: string): string {
  // NFKC folds visually identical spellings (e.g. Thai SARA AM) together.
  return name.normalize('NFKC').trim().toLocaleLowerCase('th');
}
