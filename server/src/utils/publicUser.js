function publicUser(user) {
  if (!user) return null;
  const doc = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete doc.password;
  delete doc.__v;
  delete doc.refreshTokenHash;
  delete doc.emailVerifyToken;
  delete doc.passwordResetToken;
  delete doc.passwordResetExpires;
  return doc;
}

const USER_PUBLIC_FIELDS =
  'name email role avatarUrl bio location freelancerProfile clientProfile avgRating reviewCount isBlocked emailVerified createdAt';

module.exports = { publicUser, USER_PUBLIC_FIELDS };
