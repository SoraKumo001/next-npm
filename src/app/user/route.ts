import { NextRequest, NextResponse } from "next/server";
import { NpmUserType } from "../../types/npm";

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return new NextResponse("name is required", { status: 400 });
  }
  const npmUser = await fetch(`https://www.npmjs.com/~${name}`, {
    headers: { "X-Spiferack": "1" },
  })
    .then((r) => r.json() as Promise<NpmUserType>)
    .catch(() => null);
  const img = npmUser?.scope?.parent.avatars.large;
  const token = img?.split("/")[2];
  const avatarURL = token && JSON.parse(atob(token.split(".")[1]))["avatarURL"];
  if (!avatarURL) return new NextResponse("Not Found", { status: 404 });
  return new NextResponse(avatarURL, { status: 404 });
};
