/**
 * A wire type with some fields narrowed to what the server sends but the
 * schema does not say: a JSON scalar read as its real structure, a String the
 * server keeps to a fixed set. Every use marks a field the schema could
 * declare; until it does, the read site asserts it once. A key that the wire
 * type does not have is a compile error, so a field dropped from the
 * selection set cannot stay narrowed by mistake.
 */
export type Refined<
  Wire,
  Narrowed extends { [Key in keyof Narrowed]: Key extends keyof Wire ? unknown : never },
> = Omit<Wire, keyof Narrowed> & Narrowed;
