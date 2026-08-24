export function isTextOnlyBadgeContent(children: readonly unknown[]): boolean {
  return children.every((child) => typeof child === 'string' || typeof child === 'number');
}
