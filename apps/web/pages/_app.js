import '../styles/global.css';
import Head from "next/head";

export default function App({ Component, pageProps }) {
    return (
        <>
            <Head>
                <style>
                    @import
                    url('https://fonts.googleapis.com/css2?family=Saira:wght@100&family=Press+Start+2P&family=Rubik+Vinyl&family=Lacquer&display=swap');
                </style>
            </Head>
            <Component {...pageProps} />
        </>
        );
}