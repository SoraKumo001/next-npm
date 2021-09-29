import { FormEventHandler, useEffect, useState } from 'react'
import Link from 'next/link'
import { NpmType } from '../types/npm'
import styled from './index.module.scss'
import { useRouter } from 'next/dist/client/router'

const Npm = ({ name }: { name: string }) => {
  const period = ['last-year', 'last-week', 'last-day'] as const
  const [value, setValue] = useState<{
    [key in typeof period extends [...infer R] ? R : never]: number
  }>({})

  useEffect(() => {
    period.forEach((p) => {
      fetch(`https://api.npmjs.org/downloads/point/${p}/${name}`)
        .then((r) => r.json())
        .then((r) => setValue((v) => ({ ...v, [p]: r.downloads })))
    })
  }, [])
  return (
    <>
      {period.map((range) => (
        <td key={range}>{value[range]}</td>
      ))}
    </>
  )
}

const Page = () => {
  const [value, setValue] = useState<NpmType>()
  const router = useRouter()
  const name = router.query['name']
  useEffect(() => {
    if (name) {
      fetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${name}&size=1000`)
        .then((r) => r.json())
        .then(setValue)
    }
  }, [name])
  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    router.push(`/?name=${e.currentTarget.maintainer.value}`)
  }
  return (
    <div className={styled.root}>
      <form onSubmit={handleSubmit}>
        <input name="maintainer" />
        <button>設定</button>
      </form>
      <h1>npmダウンロード数</h1>
      <table>
        <tbody>
          <tr>
            <th>index</th>
            <th>date</th>
            <th>name</th>
            <th>year</th>
            <th>week</th>
            <th>day</th>
          </tr>
          {value?.objects
            .map((o) => o.package)
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .map(({ name, date }, index) => (
              <tr key={name}>
                <td>{index + 1}</td>
                <td>{new Date(date).toLocaleString()}</td>
                <td>
                  <Link href={`https://www.npmjs.com/package/${name}`}>{name}</Link>
                </td>
                <Npm name={name} />
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
export default Page
