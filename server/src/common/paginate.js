function paginateQuery(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginateResult({ data, total, page, limit }) {
  return {
    data,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { paginateQuery, paginateResult };
