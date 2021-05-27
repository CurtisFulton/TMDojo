import React from "react";
import { HeadTitle } from "../components/common/HeadTitle";
import { SettingsProvider } from "../lib/contexts/SettingsContext";
import "../styles/globals.css";

interface Props {
    Component: any;
    pageProps: any;
}

const MyApp = ({ Component, pageProps }: Props): React.ReactElement => {
    return (
        <SettingsProvider>
            <HeadTitle />
            <Component {...pageProps} />
        </SettingsProvider>
    );
};

export default MyApp;
