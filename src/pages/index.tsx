import { GetStaticProps } from "next";
import { AppPageProps } from "./_app";
import { queryCharacters } from "@/library/queryCharacter";

export default function HomePage() {
    const { results, timeTakenMs } = queryCharacters("");
    console.log(`Found ${results.length} results in ${timeTakenMs} ms.`);

    function handleInput(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter") {
            const query = (event.target as HTMLTextAreaElement).value.trim();
            const { results, timeTakenMs } = queryCharacters(query);
            console.log(`Query: "${query}" - Found ${results.length} results in ${timeTakenMs} ms.`);
        }
    }

    return (
        <>
            <textarea rows={10} cols={50}
                onKeyDown={handleInput}
            >
            </textarea>
        </>
    );
}

export const getStaticProps: GetStaticProps<AppPageProps> = async () => {
    return {
        props: {
            title: "中文筆劃輸入法 - Chinese Stroke Input Method",
        }
    };
}