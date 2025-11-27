import styles from "@/components/InputWindow.module.css";
import { useInput, State } from "@/context/InputContext";

export default function InputWindow() {
    const {
        state,
        queryStrokes,
        ghostQueryStrokes,
        characterQueryResults,
        suggestionQueryResults,
        selectionPage,
    } = useInput();

    return (
        <div className={[
            styles.inputWindow,
            state === State.DISABLED ? styles.inputWindowDisabled : "",
        ].filter(Boolean).join(" ")}>
            <div className={styles.queryStrokes}>
                {queryStrokes !== "" ? queryStrokes : ghostQueryStrokes}
            </div>
            <div className={styles.queryResults}>
                {(characterQueryResults.length !== 0 ? characterQueryResults : suggestionQueryResults)
                    .slice(selectionPage * 10, selectionPage * 10 + 9)
                    .map((character, index) => (
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
                                {character}
                            </span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}