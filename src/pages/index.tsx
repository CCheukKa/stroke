import styles from "@/styles/index.module.css";
import { GetStaticProps } from "next";
import { AppPageProps } from "./_app";
import { useEffect, useRef, useState } from "react";
import { Stroke, StrokeWildcardable } from "@/library/Stroke";
import { G6ADBSuggestions, G6TCFEntry } from "@/library/jsoniseData";
import { queryCharactersFromStroke, queryStrokesFromCharacter, querySuggestionsFromCharacter } from "@/library/query";

export default function HomePage() {
    const enum State {
        DISABLED = "disabled",
        TYPING = "typing",
        SELECTING = "selecting",
    };
    const [state, setState] = useState<State>(State.TYPING);

    /* -------------------------------------------------------------------------- */
    const enum ActionType {
        NOOP = "ignore",
        CONSUME_KEYPRESS = "consume",
        ADD_STROKE = "add",
        DELETE_STROKE = "delete",
        CLEAR_STROKE = "clear",
        NEXT_SELECTION_PAGE = "next_page",
        PREVIOUS_SELECTION_PAGE = "previous_page",
        SELECT_CHARACTER = "select",
        SUBSTITUTE_CHARACTER = "substitute",
    };

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

    type Key = {
        code: string;
        key: string;
    };

    function stateMachine({ code, key }: Key): Action {
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
            ["~", "～"],
            ["!", "！"],
            ["@", "＠"],
            ["#", "＃"],
            ["$", "＄"],
            ["%", "％"],
            ["^", "︿"],
            ["&", "＆"],
            ["*", "＊"],
            ["(", "（"],
            [")", "）"],
            ["_", "＿"],
            ["+", "＋"],
            ["-", "－"],
            ["=", "＝"],
            ["[", "「"],
            ["]", "」"],
            ["\\", "＼"],
            ["{", "『"],
            ["}", "』"],
            ["|", "｜"],
            [";", "；"],
            ["'", "、"],
            [":", "："],
            ["\"", "＂"],
            [",", "，"],
            [".", "。"],
            ["/", "／"],
            ["<", "《"],
            [">", "》"],
            ["?", "？"],
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

    /* -------------------------------------------------------------------------- */

    let isSuggesting = false;
    function selectionIsValid(index: number): boolean {
        const globalIndex = selectionPage * 10 + index;
        if (characterQueryResults.length !== 0) {
            isSuggesting = false;
            return globalIndex < characterQueryResults.length;
        }
        if (characterQueryResults.length === 0 && suggestionQueryResults.length !== 0) {
            isSuggesting = true;
            return globalIndex < suggestionQueryResults.length;
        }
        isSuggesting = false;
        return false;
    }

    /* -------------------------------------------------------------------------- */

    const [selectionPage, setSelectionPage] = useState(0);
    const [queryStrokes, setQueryStrokes] = useState("");
    const [ghostQueryStrokes, setGhostQueryStrokes] = useState("");
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
                setSelectionPage(Math.min(selectionPage + 1, Math.ceil(characterQueryResults.length / 10)));
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
                    const suggestedCharacter = suggestionQueryResults[selectionPage * 10 + action.index];
                    insertCharacterAtCursor(suggestedCharacter);
                    console.log(`Suggested character: ${suggestedCharacter}`);
                    const lastCharacter = suggestedCharacter.slice(-1);
                    setGhostQueryStrokes(queryStrokesFromCharacter(lastCharacter).stroke);
                    setQueryStrokes("");
                    setCharacterQueryResults([]);
                    setSelectionPage(0);
                    handleSuggestionQueryFromCharacter(lastCharacter);
                } else {
                    const selectedEntry = characterQueryResults[selectionPage * 10 + action.index];
                    const selectedCharacter = selectedEntry.character;
                    insertCharacterAtCursor(selectedCharacter);
                    console.log(`Selected character: ${selectedCharacter}`);
                    setGhostQueryStrokes(selectedEntry.strokes);
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

        /* -------------------------------------------------------------------------- */

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
    }

    const [characterQueryResults, setCharacterQueryResults] = useState<G6TCFEntry[]>([]);
    function handleCharacterQueryFromStroke(strokeQuery: string) {
        const { results, timeTakenMs } = queryCharactersFromStroke(strokeQuery);
        console.log(`Query: ${strokeQuery} => Found ${results.length} results in ${timeTakenMs} ms.`);
        console.log("Results:", results);
        setCharacterQueryResults(results);
    }

    const [suggestionQueryResults, setSuggestionQueryResults] = useState<G6ADBSuggestions>([]);
    function handleSuggestionQueryFromCharacter(characterQuery: string) {
        const { suggestions, timeTakenMs } = querySuggestionsFromCharacter(characterQuery);
        console.log(`Suggestion Query: ${characterQuery} => Found ${suggestions.length} results in ${timeTakenMs} ms.`);
        console.log("Results:", suggestions);
        setSuggestionQueryResults(suggestions);
    }

    function InputWindow() {
        return (
            <div tabIndex={0} className={styles.inputWindow}>
                <div className={styles.queryStrokes}>
                    {queryStrokes !== "" ? queryStrokes : ghostQueryStrokes}
                </div>
                <div className={styles.queryResults}>
                    {characterQueryResults.length !== 0
                        ? characterQueryResults
                            .slice(selectionPage * 10, selectionPage * 10 + 9)
                            .map((entry, index) => (
                                <div key={index} className={styles.resultRow}>
                                    <span
                                        className={[
                                            styles.resultIndex,
                                            state !== State.SELECTING ? styles.resultIndexDisabled : "",
                                        ].filter(Boolean).join(" ")}
                                    >
                                        {`${index + 1}. `}
                                    </span>
                                    <span className={styles.resultCharacter}>
                                        {entry.character}
                                    </span>
                                </div>
                            ))
                        : suggestionQueryResults
                            .slice(selectionPage * 10, selectionPage * 10 + 9)
                            .map((suggestion, index) => (
                                <div key={index} className={styles.resultRow}>
                                    <span
                                        className={[
                                            styles.resultIndex,
                                            state !== State.SELECTING ? styles.resultIndexDisabled : "",
                                        ].filter(Boolean).join(" ")}
                                    >
                                        {`${index + 1}. `}
                                    </span>
                                    <span className={styles.resultCharacter}>
                                        {suggestion}
                                    </span>
                                </div>
                            ))
                    }
                </div>
            </div>
        );
    }

    /* -------------------------------------------------------------------------- */

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (textAreaRef.current && e.target !== textAreaRef.current) {
                e.preventDefault();
                textAreaRef.current.focus();
                const keyboardEvent = new KeyboardEvent(e.type, {
                    key: e.key,
                    code: e.code,
                    location: e.location,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                    altKey: e.altKey,
                    metaKey: e.metaKey,
                    repeat: e.repeat,
                    bubbles: true,
                    cancelable: true,
                });
                textAreaRef.current.dispatchEvent(keyboardEvent);
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);
    return (
        <div className={styles.container}>
            <textarea
                ref={textAreaRef}
                className={styles.textarea}
                placeholder="在此輸入文字..."
                onKeyDown={handleInput}
            />
            <InputWindow />
        </div>
    );
}

export const getStaticProps: GetStaticProps<AppPageProps> = async () => {
    return {
        props: {
            title: "中文筆劃輸入法 - Chinese Stroke Input Method",
        }
    };
}