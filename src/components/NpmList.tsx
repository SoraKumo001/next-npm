"use client";
import { semaphore } from "@node-libraries/semaphore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSSR } from "next-ssr";
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
  const [prevObjects, setPrevObjects] = useState(objects);
  const [downloads, setDownloads] = useState<Record<string, number[]>>({});

  // objects が変わったら downloads をクリアする（レンダリング中に状態調整）
  if (objects !== prevObjects) {
    setPrevObjects(objects);
    setDownloads({});
  }

  const downloadsDelay = useDeferredValue(downloads);

  useEffect(() => {
    if (objects) {
      const periods = ["last-year", "last-week", "last-day"] as const;

      // スコープ付きとスコープなしに分類
      const scoped: string[] = [];
      const unscoped: string[] = [];
      objects.forEach((npm) => {
        const name = npm.package.name;
        if (name.startsWith("@")) {
          scoped.push(name);
        } else {
          unscoped.push(name);
        }
      });

      // 429時のバックオフリトライ機能付き fetch
      const fetchWithRetry = async (url: string, retries = 5, initialDelay = 5000): Promise<unknown> => {
        let delay = initialDelay;
        for (let i = 0; i < retries; i++) {
          try {
            const res = await fetch(url);
            if (res.status === 429) {
              console.warn(`429 Too Many Requests on ${url}. Waiting ${delay}ms before retry ${i + 1}/${retries}...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 2; // 指数バックオフ (2倍)
              continue;
            }
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return await res.json();
          } catch (err) {
            console.error(`Fetch error on ${url}:`, err);
            if (i === retries - 1) throw err;
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
          }
        }
      };

      periods.forEach((period, index) => {
        // 1. スコープなしパッケージの一括（バルク）取得
        if (unscoped.length > 0) {
          (async () => {
            const chunkSize = 100;
            for (let i = 0; i < unscoped.length; i += chunkSize) {
              const chunk = unscoped.slice(i, i + chunkSize);
              const url = `https://api.npmjs.org/downloads/point/${period}/${chunk.join(",")}`;

              await s.acquire();
              try {
                const value = await fetchWithRetry(url);
                if (value && typeof value === "object" && !("error" in value)) {
                  const data = value as Record<string, { downloads?: number } | undefined>;
                  setDownloads((v) => {
                    const next = { ...v };
                    chunk.forEach((name) => {
                      const item = data[name];
                      if (item && typeof item.downloads === "number") {
                        const d = next[name] ? [...next[name]] : Array(3).fill(undefined);
                        d[index] = item.downloads;
                        next[name] = d;
                      }
                    });
                    return next;
                  });
                }
              } catch (err) {
                console.error(`Failed to fetch bulk downloads for chunk after retries:`, chunk, err);
              } finally {
                s.release();
              }
            }
          })();
        }

        // 2. スコープ付きパッケージの個別取得
        scoped.forEach(async (name) => {
          await s.acquire();
          const url = `https://api.npmjs.org/downloads/point/${period}/${name}`;
          try {
            const value = await fetchWithRetry(url);
            if (value && typeof value === "object" && "downloads" in value) {
              const data = value as { downloads: unknown };
              if (typeof data.downloads === "number") {
                setDownloads((v) => {
                  const d = v[name] ? [...v[name]] : Array(3).fill(undefined);
                  d[index] = data.downloads as number;
                  return { ...v, [name]: d };
                });
              }
            }
          } catch (err) {
            console.error(`Failed to fetch downloads for ${name} after retries:`, err);
          } finally {
            s.release();
          }
        });
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
    <div className="flex h-screen flex-col overflow-hidden">
      <title>{`${name} npm list`}</title>
      <meta property="description" content={systemDescription} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={systemDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content={"summary"} />
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-1 shrink-0">
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

      <div className="flex-1 overflow-auto">
        <table className="table [&_*]:border-gray-300 [&_td]:border-x [&_td]:p-1 [&_th:hover]:bg-slate-100 [&_th]:border-x [&_th]:p-2 w-full">
          <thead>
            <tr className="sticky top-0 cursor-pointer bg-white text-lg font-semibold z-10">
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
                {(downloads[name] ?? Array(3).fill(undefined)).map((v, index) => (
                  <td key={index}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
