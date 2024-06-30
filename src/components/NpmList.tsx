import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { SSRProvider, useSSR } from "next-ssr";
import {
  FormEventHandler,
  MouseEventHandler,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NpmType, NpmUserType } from "../types/npm";

export const NpmList = ({ host }: { host: string }) => {
  const router = useRouter();
  const name = String(router.query["name"] ?? "");
  const { data: value } = useSSR<[NpmType, NpmUserType]>(
    () =>
      Promise.all([
        fetch(
          `https://registry.npmjs.org/-/v1/search?text=maintainer:${name}&size=1000`
        ).then((r) => r.json()),
        fetch(`${host}/user/?name=${name}`).then((r) => r.json()),
      ]),
    { key: name }
  );
  const [downloads, setDownloads] = useState<Record<string, number[]>>({});
  const downloadsDelay = useDeferredValue(downloads);
  const sortIndex = Number(router.query["sort"] || "0");
  useEffect(() => {
    if (value) {
      value[0].objects.forEach((npm) => {
        const name = npm.package.name;
        setDownloads((v) => ({ ...v, [name]: Array(3).fill(undefined) }));
        const periods = ["last-year", "last-week", "last-day"] as const;
        periods.forEach((period, index) => {
          fetch(`https://api.npmjs.org/downloads/point/${period}/${name}`)
            .then((r) => r.json())
            .then((r) => {
              setDownloads((v) => {
                const d: number[] = v[name] ?? [];
                d[index] = r.downloads;
                return { ...v, [name]: d };
              });
            });
        });
      });
    }
  }, [value]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    router.push(`/?name=${e.currentTarget.maintainer.value}`);
    router.replace({ query: { name, sort: sortIndex } });
  };
  const handleClick: MouseEventHandler<HTMLElement> = (e) => {
    const index = e.currentTarget.dataset["index"];
    router.replace({ query: { name, sort: index } });
  };
  const items = useMemo(() => {
    return value?.[0].objects
      .map((o) => o.package)
      .sort((a, b) => {
        switch (sortIndex) {
          default:
            return 0;
          case 1:
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case 2:
            return a.name < b.name ? -1 : 1;
          case 3:
          case 4:
          case 5:
            return (
              (downloadsDelay[b.name]?.[sortIndex - 3] ?? 0) -
              (downloadsDelay[a.name]?.[sortIndex - 3] ?? 0)
            );
        }
      });
  }, [value, sortIndex, downloadsDelay]);

  const title = name ? `${name} npm packages list` : "List of npm packages";
  const systemDescription = name
    ? `Number of npm packages is ${value?.[0].objects.length ?? 0}`
    : "System for listing npm packages";
  const image = value?.[1].scope?.parent.avatars.large;
  const imageUrl = image ? `https://www.npmjs.com${image}` : undefined;
  return (
    <div>
      <Head>
        <title>{`${name} npm list`}</title>
        <meta property="description" content={systemDescription} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={systemDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={imageUrl} />
        <meta name="twitter:card" content={"summary"} />
      </Head>

      <form onSubmit={handleSubmit} className="flex gap-2 p-1">
        <input
          name="maintainer"
          className="input input-bordered w-full max-w-xs"
          defaultValue={name}
        />
        <button className="btn">設定</button>
      </form>

      <table className="table [&_*]:border-gray-300 [&_td]:border-x [&_td]:py-1 [&_th:hover]:bg-slate-100 [&_th]:border-x">
        <thead>
          <tr className="sticky top-0 cursor-pointer bg-white text-lg font-semibold">
            {["index", "date", "name", "year", "week", "day"].map(
              (v, index) => (
                <th key={v} onClick={handleClick} data-index={index}>
                  {v}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="[&_tr:nth-child(odd)]:bg-slate-200">
          {items?.map(({ name, date }, index) => (
            <tr key={name}>
              <td>{index + 1}</td>
              <td>{new Date(date).toLocaleString()}</td>
              <td>
                <Link
                  href={`https://www.npmjs.com/package/${name}`}
                  target="_blank"
                >
                  {name}
                </Link>
              </td>
              {downloads[name]?.map((v, index) => <td key={index}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
