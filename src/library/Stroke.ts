export const enum Stroke {
    POSITIVE_DIAGONAL = "丿",
    NEGATIVE_DIAGONAL = "丶",
    VERTICAL = "丨",
    HORIZONTAL = "一",
    COMPOUND = "フ",
    EMPTY = "",
    WILDCARD = "＊",
};

export type StrokeValid = Stroke.POSITIVE_DIAGONAL | Stroke.NEGATIVE_DIAGONAL | Stroke.VERTICAL | Stroke.HORIZONTAL | Stroke.COMPOUND;
export type StrokeEmptyable = StrokeValid | Stroke.EMPTY;
export type StrokeWildcardable = StrokeValid | Stroke.WILDCARD;