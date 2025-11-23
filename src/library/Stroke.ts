export const enum Stroke {
    POSITIVE_DIAGONAL = "丿",
    NEGATIVE_DIAGONAL = "丶",
    VERTICAL = "丨",
    HORIZONTAL = "一",
    COMPOUND = "フ",
};

export const enum StrokeEmptyable {
    POSITIVE_DIAGONAL = Stroke.POSITIVE_DIAGONAL,
    NEGATIVE_DIAGONAL = Stroke.NEGATIVE_DIAGONAL,
    VERTICAL = Stroke.VERTICAL,
    HORIZONTAL = Stroke.HORIZONTAL,
    COMPOUND = Stroke.COMPOUND,
    EMPTY = "",
};

export const enum StrokeWildcardable {
    POSITIVE_DIAGONAL = Stroke.POSITIVE_DIAGONAL,
    NEGATIVE_DIAGONAL = Stroke.NEGATIVE_DIAGONAL,
    VERTICAL = Stroke.VERTICAL,
    HORIZONTAL = Stroke.HORIZONTAL,
    COMPOUND = Stroke.COMPOUND,
    WILDCARD = "*",
};