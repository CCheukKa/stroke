import "@/styles/!GLOBALS.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export type AppPageProps = {
    title: string;
};

export default function App({ Component, pageProps }: AppProps<AppPageProps>) {
    return (
        <>
            <Head>
                <title>{pageProps.title}</title>
                <meta name="view-transition" content="same-origin" />
            </Head>
            <main>
                <Component {...pageProps} />
            </main>
        </>
    );
}