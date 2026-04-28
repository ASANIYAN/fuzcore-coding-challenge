export const success = <T>(data: T, meta?: Record<string, unknown>) => ({
  success: true as const,
  data,
  meta: meta ?? {},
});

export const paginated = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) => ({
  success: true as const,
  data,
  meta: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});
