function publicUser(user) {
  if (!user) return null;
  const doc = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete doc.password;
  delete doc.__v;
  return doc;
}

const USER_PUBLIC_FIELDS =
  'name email role avatarUrl bio location freelancerProfile clientProfile avgRating reviewCount isBlocked createdAt';

module.exports = { publicUser, USER_PUBLIC_FIELDS };
