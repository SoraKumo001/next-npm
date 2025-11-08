import { headers } from "next/headers";
import { NpmList } from "../components/NpmList";

const Page = async () => {
  const host = await headers().then((headers) => {
    const host = headers.get("x-forwarded-host") ?? headers.get("host");
    const proto =
      headers.get("x-forwarded-proto")?.toString().split(",")[0] ?? "http";
    return `${proto}://${host}`;
  });
  return <NpmList host={host ?? ""} />;
};
export default Page;
