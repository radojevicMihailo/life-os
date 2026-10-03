export function decimalInputValue(value: string | undefined): string | undefined {
  return value?.replace(".", ",");
}
