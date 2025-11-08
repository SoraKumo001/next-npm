"use client";
import { NpmList } from "../components/NpmList";

const Page = ({ host }: { host: string }) => {
  return <NpmList host={host} />;
};
export default Page;
