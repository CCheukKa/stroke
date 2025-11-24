import styles from "@/styles/index.module.css";
import { GetStaticProps } from "next";
import { AppPageProps } from "./_app";
import { useEffect } from "react";
import { InputProvider, useInput } from "@/context/InputContext";
import InputWindow from "@/components/InputWindow";

function HomePageContent() {
    const { textAreaRef, handleInput } = useInput();

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
    }, [textAreaRef]);

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

export default function HomePage() {
    return (
        <InputProvider>
            <HomePageContent />
        </InputProvider>
    );
}

export const getStaticProps: GetStaticProps<AppPageProps> = async () => {
    return {
        props: {
            title: "中文筆劃輸入法 - Chinese Stroke Input Method",
        }
    };
}