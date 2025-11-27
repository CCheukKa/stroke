import { createContext, useContext, useState, useRef, ReactNode, useEffect } from "react";
import { Stroke, StrokeWildcardable } from "@/library/Stroke";
import { queryCharactersFromStroke, queryStrokesFromCharacter, querySuggestionsFromCharacter } from "@/library/query";

export enum State {
    DISABLED = "disabled",
    TYPING = "typing",
    SELECTING = "selecting",
}

enum ActionType {
    NOOP = "ignore",
    CONSUME_KEYPRESS = "consume",
    ADD_STROKE = "add",
    DELETE_STROKE = "delete",
    CLEAR_STROKE = "clear",
    NEXT_SELECTION_PAGE = "next_page",
    PREVIOUS_SELECTION_PAGE = "previous_page",
    SELECT_CHARACTER = "select",
    SUBSTITUTE_CHARACTER = "substitute",
}

type Action = {
    type: ActionType.NOOP | ActionType.CONSUME_KEYPRESS | ActionType.DELETE_STROKE | ActionType.CLEAR_STROKE | ActionType.NEXT_SELECTION_PAGE | ActionType.PREVIOUS_SELECTION_PAGE;
} | {
    type: ActionType.ADD_STROKE;
    input: StrokeWildcardable;
} | {
    type: ActionType.SELECT_CHARACTER;
    index: number;
} | {
    type: ActionType.SUBSTITUTE_CHARACTER;
    character: string;
};

type InputContextValue = {
    state: State;
    queryStrokes: string;
    ghostQueryStrokes: string;
    characterQueryResults: string[];
    suggestionQueryResults: string[];
    selectionPage: number;
    textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
    handleInput: (event: React.KeyboardEvent) => void;
};

const InputContext = createContext<InputContextValue | null>(null);

export function useInput() {
    const ctx = useContext(InputContext);
    if (!ctx) throw new Error("useInput must be used within InputProvider");
    return ctx;
}

type InputProviderProps = {
    children: ReactNode;
};

export function InputProvider({ children }: InputProviderProps) {
    const [state, setState] = useState<State>(State.TYPING);
    const [selectionPage, setSelectionPage] = useState(0);
    const [queryStrokes, setQueryStrokes] = useState("");
    const [ghostQueryStrokes, setGhostQueryStrokes] = useState("");
    const [characterQueryResults, setCharacterQueryResults] = useState<string[]>([]);
    const [suggestionQueryResults, setSuggestionQueryResults] = useState<string[]>([]);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const [isSuggesting, setIsSuggesting] = useState(false);
    useEffect(() => {
        setIsSuggesting(characterQueryResults.length === 0 && suggestionQueryResults.length !== 0);
    }, [characterQueryResults, suggestionQueryResults]);

    function selectionIsValid(index: number): boolean {
        if (characterQueryResults.length === 0 && suggestionQueryResults.length === 0) {
            return false;
        }

        const globalIndex = selectionPage * 9 + index;
        return isSuggesting
            ? globalIndex < suggestionQueryResults.length
            : globalIndex < characterQueryResults.length;
    }

    function handleCharacterQueryFromStroke(strokeQuery: string) {
        const { characters: results, timeTakenMs } = queryCharactersFromStroke(strokeQuery);
        console.log(`Query: ${strokeQuery} => Found ${results.length} results in ${timeTakenMs} ms.`);
        console.log("Results:", results);
        setCharacterQueryResults(results);
    }

    function handleSuggestionQueryFromCharacter(characterQuery: string) {
        const { suggestions, timeTakenMs } = querySuggestionsFromCharacter(characterQuery);
        console.log(`Suggestion Query: ${characterQuery} => Found ${suggestions.length} results in ${timeTakenMs} ms.`);
        console.log("Results:", suggestions);
        setSuggestionQueryResults(suggestions);
    }

    function insertCharacterAtCursor(character: string) {
        if (textAreaRef.current) {
            const textarea = textAreaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            textarea.value = value.slice(0, start) + character + value.slice(end);
            textarea.selectionStart = textarea.selectionEnd = start + character.length;
            textarea.focus();
        }
    }

    function stateMachine({ code, key }: { code: string; key: string }): Action {
        console.log(`State Machine: Current State = ${state}, Key = ${code} (${key})`);

        const Keybinds = {
            TOGGLE_ENABLE: "AltLeft",
            STORKE_NEGATIVE_DIAGONAL: "Numpad4",
            STORKE_COMPOUND: "Numpad5",
            STORKE_WILDCARD: "Numpad6",
            STORKE_HORIZONTAL: "Numpad7",
            STORKE_VERTICAL: "Numpad8",
            STORKE_POSITIVE_DIAGONAL: "Numpad9",
            DELETE: "Backspace",
            CLEAR: "Escape",
            TOGGLE_SELECT: "Numpad0",
            NEXT_PAGE: "NumpadAdd",
            PREVIOUS_PAGE: "NumpadSubtract",
            SELECT_FIRST: "NumpadEnter",
            SELECT_1: "Numpad1",
            SELECT_2: "Numpad2",
            SELECT_3: "Numpad3",
            SELECT_4: "Numpad4",
            SELECT_5: "Numpad5",
            SELECT_6: "Numpad6",
            SELECT_7: "Numpad7",
            SELECT_8: "Numpad8",
            SELECT_9: "Numpad9",
        } as const;

        const substitutableCharacters: Map<string, string> = new Map([
            ["~", "～"], ["!", "！"], ["@", "＠"], ["#", "＃"],
            ["$", "＄"], ["%", "％"], ["^", "︿"], ["&", "＆"],
            ["*", "＊"], ["(", "（"], [")", "）"], ["_", "＿"],
            ["+", "＋"], ["-", "－"], ["=", "＝"], ["[", "「"],
            ["]", "」"], ["\\", "＼"], ["{", "『"], ["}", "』"],
            ["|", "｜"], [";", "；"], ["'", "、"], [":", "："],
            ["\"", "＂"], [",", "，"], [".", "。"], ["/", "／"],
            ["<", "《"], [">", "》"], ["?", "？"],
        ]);

        switch (state) {
            case State.DISABLED: {
                switch (code) {
                    case Keybinds.TOGGLE_ENABLE: {
                        setState(State.TYPING);
                        return { type: ActionType.CLEAR_STROKE };
                    }
                    default: {
                        return { type: ActionType.NOOP };
                    }
                }
            }
            case State.TYPING: {
                switch (code) {
                    case Keybinds.TOGGLE_ENABLE: {
                        setState(State.DISABLED);
                        return { type: ActionType.CLEAR_STROKE };
                    }
                    case Keybinds.STORKE_POSITIVE_DIAGONAL: { return { type: ActionType.ADD_STROKE, input: Stroke.POSITIVE_DIAGONAL }; }
                    case Keybinds.STORKE_NEGATIVE_DIAGONAL: { return { type: ActionType.ADD_STROKE, input: Stroke.NEGATIVE_DIAGONAL }; }
                    case Keybinds.STORKE_VERTICAL: { return { type: ActionType.ADD_STROKE, input: Stroke.VERTICAL }; }
                    case Keybinds.STORKE_HORIZONTAL: { return { type: ActionType.ADD_STROKE, input: Stroke.HORIZONTAL }; }
                    case Keybinds.STORKE_COMPOUND: { return { type: ActionType.ADD_STROKE, input: Stroke.COMPOUND }; }
                    case Keybinds.STORKE_WILDCARD: { return { type: ActionType.ADD_STROKE, input: Stroke.WILDCARD }; }
                    case Keybinds.DELETE: { return { type: ActionType.DELETE_STROKE }; }
                    case Keybinds.CLEAR: { return { type: ActionType.CLEAR_STROKE }; }
                    case Keybinds.SELECT_FIRST: {
                        if (!selectionIsValid(0)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 0 };
                    }
                    case Keybinds.TOGGLE_SELECT: {
                        setState(State.SELECTING);
                        return { type: ActionType.CONSUME_KEYPRESS };
                    }
                }
                if (substitutableCharacters.has(key)) {
                    const character = substitutableCharacters.get(key)!;
                    return { type: ActionType.SUBSTITUTE_CHARACTER, character };
                }
                return { type: ActionType.NOOP };
            }
            case State.SELECTING: {
                switch (code) {
                    case Keybinds.TOGGLE_ENABLE: {
                        setState(State.DISABLED);
                        return { type: ActionType.CLEAR_STROKE };
                    }
                    case Keybinds.CLEAR: {
                        setState(State.TYPING);
                        return { type: ActionType.CLEAR_STROKE };
                    }
                    case Keybinds.TOGGLE_SELECT: {
                        setState(State.TYPING);
                        return { type: ActionType.CONSUME_KEYPRESS };
                    }
                    case Keybinds.DELETE: {
                        setState(State.TYPING);
                        return { type: ActionType.DELETE_STROKE };
                    }
                    case Keybinds.NEXT_PAGE: { return { type: ActionType.NEXT_SELECTION_PAGE }; }
                    case Keybinds.PREVIOUS_PAGE: { return { type: ActionType.PREVIOUS_SELECTION_PAGE }; }
                    case Keybinds.SELECT_FIRST:
                    case Keybinds.SELECT_1: {
                        if (!selectionIsValid(0)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 0 };
                    }
                    case Keybinds.SELECT_2: {
                        if (!selectionIsValid(1)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 1 };
                    }
                    case Keybinds.SELECT_3: {
                        if (!selectionIsValid(2)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 2 };
                    }
                    case Keybinds.SELECT_4: {
                        if (!selectionIsValid(3)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 3 };
                    }
                    case Keybinds.SELECT_5: {
                        if (!selectionIsValid(4)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 4 };
                    }
                    case Keybinds.SELECT_6: {
                        if (!selectionIsValid(5)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 5 };
                    }
                    case Keybinds.SELECT_7: {
                        if (!selectionIsValid(6)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 6 };
                    }
                    case Keybinds.SELECT_8: {
                        if (!selectionIsValid(7)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 7 };
                    }
                    case Keybinds.SELECT_9: {
                        if (!selectionIsValid(8)) { return { type: ActionType.NOOP }; }
                        setState(State.TYPING);
                        return { type: ActionType.SELECT_CHARACTER, index: 8 };
                    }
                    default: {
                        return { type: ActionType.NOOP };
                    }
                }
            }
        }

        console.warn("State machine reached unreachable state.");
        return { type: ActionType.NOOP };
    }

    function handleInput(event: React.KeyboardEvent) {
        const action = stateMachine({ code: event.code, key: event.key });
        console.log("Action:", action);

        switch (action.type) {
            case ActionType.NOOP: {
                return;
            }
            case ActionType.CONSUME_KEYPRESS: {
                event.preventDefault();
                return;
            }
            case ActionType.ADD_STROKE: {
                event.preventDefault();
                let newQueryStroke = queryStrokes + action.input;
                setGhostQueryStrokes("");
                setQueryStrokes(newQueryStroke);
                handleCharacterQueryFromStroke(newQueryStroke);
                setSelectionPage(0);
                setSuggestionQueryResults([]);
                return;
            }
            case ActionType.DELETE_STROKE: {
                if (queryStrokes.length === 0) { return; }
                event.preventDefault();
                let newQueryStroke = queryStrokes.slice(0, -1);
                setGhostQueryStrokes("");
                setQueryStrokes(newQueryStroke);
                handleCharacterQueryFromStroke(newQueryStroke);
                setSelectionPage(0);
                setSuggestionQueryResults([]);
                return;
            }
            case ActionType.CLEAR_STROKE: {
                event.preventDefault();
                setGhostQueryStrokes("");
                setQueryStrokes("");
                setCharacterQueryResults([]);
                setSelectionPage(0);
                setSuggestionQueryResults([]);
                return;
            }
            case ActionType.NEXT_SELECTION_PAGE: {
                event.preventDefault();
                if (isSuggesting) {
                    setSelectionPage(Math.min(selectionPage + 1, Math.floor(suggestionQueryResults.length / 9)));
                } else {
                    setSelectionPage(Math.min(selectionPage + 1, Math.floor(characterQueryResults.length / 9)));
                }
                return;
            }
            case ActionType.PREVIOUS_SELECTION_PAGE: {
                event.preventDefault();
                setSelectionPage(Math.max(0, selectionPage - 1));
                return;
            }
            case ActionType.SELECT_CHARACTER: {
                event.preventDefault();
                if (!selectionIsValid(action.index)) { return; }

                if (isSuggesting) {
                    const suggestedCharacter = suggestionQueryResults[selectionPage * 9 + action.index];
                    insertCharacterAtCursor(suggestedCharacter);
                    console.log(`Suggested character: ${suggestedCharacter}`);
                    const lastCharacter = suggestedCharacter.slice(-1);
                    setGhostQueryStrokes(queryStrokesFromCharacter(lastCharacter).strokes);
                    setQueryStrokes("");
                    setCharacterQueryResults([]);
                    setSelectionPage(0);
                    handleSuggestionQueryFromCharacter(lastCharacter);
                } else {
                    const selectedCharacter = characterQueryResults[selectionPage * 9 + action.index];
                    insertCharacterAtCursor(selectedCharacter);
                    console.log(`Selected character: ${selectedCharacter}`);
                    setGhostQueryStrokes(queryStrokesFromCharacter(selectedCharacter).strokes);
                    setQueryStrokes("");
                    setCharacterQueryResults([]);
                    setSelectionPage(0);
                    handleSuggestionQueryFromCharacter(selectedCharacter);
                }
                return;
            }
            case ActionType.SUBSTITUTE_CHARACTER: {
                event.preventDefault();
                const substitutedCharacter = action.character;
                insertCharacterAtCursor(substitutedCharacter);
                console.log(`Substituted character: ${substitutedCharacter}`);
                setGhostQueryStrokes("");
                setQueryStrokes("");
                setCharacterQueryResults([]);
                setSuggestionQueryResults([]);
                setSelectionPage(0);
                return;
            }
        }
        console.warn("Input handler reached unreachable state.");
    }

    const value: InputContextValue = {
        state,
        queryStrokes,
        ghostQueryStrokes,
        characterQueryResults,
        suggestionQueryResults,
        selectionPage,
        textAreaRef,
        handleInput,
    };

    return (
        <InputContext.Provider value={value}>
            {children}
        </InputContext.Provider>
    );
}