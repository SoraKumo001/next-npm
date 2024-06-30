import { IncomingMessage } from "http";
import { AppContext, AppProps } from "next/app";
import "./global.css";
import { SSRProvider } from "next-ssr";

const App = ({ Component, pageProps }: AppProps<{ host?: string }>) => {
  const { host } = pageProps;
  return (
    <SSRProvider>
      <Component {...pageProps} />
    </SSRProvider>
  );
};

App.getInitialProps = async (context: AppContext) => {
  const host = getHost(context?.ctx?.req);
  return {
    pageProps: {
      host,
    },
  };
};

export const getHost = (req?: Partial<IncomingMessage>) => {
  const headers = req?.headers;
  const host = headers?.["x-forwarded-host"] ?? headers?.["host"];
  if (!host) return undefined;
  const proto =
    headers?.["x-forwarded-proto"]?.toString().split(",")[0] ?? "http";
  return headers ? `${proto}://${host}` : undefined;
};

export default App;
