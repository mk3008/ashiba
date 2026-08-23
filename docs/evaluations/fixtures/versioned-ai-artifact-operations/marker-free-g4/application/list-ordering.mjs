// Ordinary application-owned policy. It is intentionally not derived metadata.
export const listOrdering = {
  maxKeys: 3,
  keys: {
    name: { asc: 'w.name ASC', desc: 'w.name DESC' },
    createdAt: { asc: 'w.created_at ASC', desc: 'w.created_at DESC' },
    priority: {
      asc: "CASE WHEN w.priority = 'urgent' THEN 1 WHEN w.priority = 'normal' THEN 2 ELSE 3 END ASC",
      desc: "CASE WHEN w.priority = 'urgent' THEN 1 WHEN w.priority = 'normal' THEN 2 ELSE 3 END DESC",
    },
  },
  tieBreaker: 'w.id ASC',
};
