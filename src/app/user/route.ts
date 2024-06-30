import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return new NextResponse("name is required", { status: 400 });
  }
  const res = await fetch(`https://www.npmjs.com/~${name}`, {
    headers: { "X-Spiferack": "1" },
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: Array.from(res.headers).filter(([name]) =>
      ["content-type", "content-length", "age", "date"].includes(name)
    ),
  });
};
