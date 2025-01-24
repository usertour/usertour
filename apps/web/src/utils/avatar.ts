import sha256 from "crypto-js/sha256";

export const getGravatarUrl = (email: string, size = 80) => {
  const trimmedEmail = email.trim().toLowerCase();
  const hash = sha256(trimmedEmail);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
};
