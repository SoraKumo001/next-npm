"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEventHandler,
  MouseEventHandler,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DateString } from "../libs/DateString";
import { NpmObject, NpmPackagesType } from "../types/npm";
import { semaphore } from "@node-libraries/semaphore";
import { useSSR } from "next-ssr";

const s = semaphore(4);

const usePackages = (name: string, host?: string) => {
  const { data } = useSSR<[NpmPackagesType, string] | undefined>(
    () =>
      Promise.all([
        fetch(
          `https://registry.npmjs.org/-/v1/search?text=maintainer:${name}&size=1000`
        ).then((r) => r.json()),
        fetch(`${host ?? ""}/user?name=${name}`).then((r) => r.text()),
      ]),
    { key: name }
  );
  return data;
};

const usePackageDownloads = (objects?: NpmObject[]) => {
  const [downloads, setDownloads] = useState<Record<string, number[]>>({});
  const downloadsDelay = useDeferredValue(downloads);
  useEffect(() => {
    if (objects) {
      objects.forEach(async (npm) => {
        const name = npm.package.name;
        setDownloads((v) => ({ ...v, [name]: Array(3).fill(undefined) }));
        const periods = ["last-year", "last-week", "last-day"] as const;
        periods.forEach(async (period, index) => {
          await s.acquire();
          const value = await fetch(
            `https://api.npmjs.org/downloads/point/${period}/${name}`
          )
            .then((r) => r.json())
            .then((r) => {
              return r.downloads;
            })
            .catch(() => undefined);
          if (value) {
            setDownloads((v) => {
              const d: number[] = v[name] ?? [];
              d[index] = value;
              return { ...v, [name]: d };
            });
          }
          if (!value) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          s.release();
        });
        await s.all();
      });
    }
  }, [objects]);
  return downloadsDelay;
};

export const NpmList = ({ host }: { host?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "";
  const value = usePackages(name, host);

  const downloads = usePackageDownloads(value?.[0].objects);
  const sortIndex = Number(searchParams.get("sort") || "0");

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("name", e.currentTarget.maintainer.value);
    if (sortIndex) {
      newSearchParams.set("sort", String(sortIndex));
    } else {
      newSearchParams.delete("sort");
    }
    router.push(`?${newSearchParams.toString()}`);
  };
  const handleClick: MouseEventHandler<HTMLElement> = (e) => {
    const index = e.currentTarget.dataset["index"];
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (index) {
      newSearchParams.set("sort", index);
    } else {
      newSearchParams.delete("sort");
    }
    router.replace(`?${newSearchParams.toString()}`);
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
              (downloads[b.name]?.[sortIndex - 3] ?? 0) -
              (downloads[a.name]?.[sortIndex - 3] ?? 0)
            );
        }
      });
  }, [value, sortIndex, downloads]);

  const title = name ? `${name} npm packages list` : "List of npm packages";
  const systemDescription = name
    ? `Number of npm packages is ${value?.[0].objects.length ?? 0}`
    : "System for listing npm packages";
  const imageUrl = value?.[1];

  return (
    <>
      <title>{`${name} npm list`}</title>
      <meta property="description" content={systemDescription} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={systemDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content={"summary"} />
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-1">
        <input
          name="maintainer"
          className="input input-bordered w-full max-w-xs"
          defaultValue={name}
        />
        <button className="btn" type="submit">
          設定
        </button>
        <Link
          href="https://github.com/SoraKumo001/next-npm"
          className="underline"
          target="_blank"
        >
          Source Code
        </Link>
      </form>

      <table className="table [&_*]:border-gray-300 [&_td]:border-x [&_td]:p-1 [&_th:hover]:bg-slate-100 [&_th]:border-x [&_th]:p-2 w-full">
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
              <td>{DateString(date)}</td>
              <td>
                <Link
                  href={`https://www.npmjs.com/package/${name}`}
                  target="_blank"
                >
                  {name}
                </Link>
              </td>
              {downloads[name]?.map((v, index) => (
                <td key={index}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
