export function parseCss(css: string): React.CSSProperties {
  if (!css) return {};
  return css.split(';').reduce((acc, rule) => {
    const [key, value] = rule.split(':').map(s => s.trim());
    if (key && value) {
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      (acc as any)[camelKey] = value;
    }
    return acc;
  }, {} as React.CSSProperties);
}
