import { SSRProvider } from "next-ssr";

import { NpmList } from "../components/NpmList";

const Page = () => {
  return (
    <SSRProvider>
      <NpmList />
    </SSRProvider>
  );
};
export default Page;
