/**
 * Three ready-made looks for the advanced choices of a picture scene: only the choices the block really has are set,
 * and only to values it offers. "Cân bằng" puts everything back on auto.
 */
export function motionPresets(fields: ToolFieldLike[]) {
  const offers = (key: string, value: string) => fields.find((f) => f.key === key)?.options?.some((o) => o.value === value) ?? false;
  const pick = (values: Record<string, string>) => Object.fromEntries(Object.entries(values).filter(([k, v]) => offers(k, v)));
  const list = [
    { id: 'calm', name: 'Êm', hint: 'Chuyển động nhẹ, ảnh tràn khung, không hiệu ứng', values: pick({ motion: 'zoom-in', depth: 'flat', fx: 'none', rhythm: 'none', transition: 'fade' }) },
    { id: 'balanced', name: 'Cân bằng', hint: 'Để hệ thống tự đổi luân phiên', values: pick({ motion: 'auto', depth: 'auto', fx: 'auto', rhythm: 'auto', transition: 'auto', shot: 'auto' }) },
    { id: 'dramatic', name: 'Kịch tính', hint: 'Đập zoom, ảnh nổi, đèn rọi, loé sáng', values: pick({ motion: 'crash-zoom', depth: 'layered', fx: 'spotlight', rhythm: 'none', transition: 'flash' }) },
  ];
  return list.filter((p) => Object.keys(p.values).length >= 2);
}

export type ToolFieldLike = { key: string; options?: { value: string; label: string }[] };
