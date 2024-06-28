import { useRouter } from "next/dist/client/router";
import Link from "next/link";
import {
  FormEventHandler,
  MouseEventHandler,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NpmType } from "../types/npm";

const Page = () => {
  const [value, setValue] = useState<NpmType>();
  const [downloads, setDownloads] = useState<Record<string, number[]>>({});
  const downloadsDelay = useDeferredValue(downloads);
  const router = useRouter();
  const name = router.query["name"];
  const sortIndex = Number(router.query["sort"] || "0");
  useEffect(() => {
    if (name) {
      fetch(
        `https://registry.npmjs.org/-/v1/search?text=maintainer:${name}&size=1000`,
      )
        .then((r) => r.json())
        .then((r: NpmType) => {
          setValue(r);
          r.objects.forEach((npm) => {
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
        });
    }
  }, [name]);
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
    return value?.objects
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

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 p-1">
        <input
          name="maintainer"
          className="input input-bordered w-full max-w-xs"
          defaultValue={name}
        />
        <button className="btn">設定</button>
      </form>

      <table className="table [&_*]:border-gray-300 [&_td]:border-x [&_td]:py-1 [&_th:hover]:bg-slate-100 [&_th]:border-x">
        <thead className="">
          <tr className="sticky top-0 cursor-pointer bg-white text-lg font-semibold">
            {["index", "date", "name", "year", "week", "day"].map(
              (v, index) => (
                <th key={v} onClick={handleClick} data-index={index}>
                  {v}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="">
          {items?.map(({ name, date }, index) => (
            <tr key={name} className="odd:bg-slate-200">
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
              {downloads[name].map((v, index) => (
                <td key={index}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default Page;
