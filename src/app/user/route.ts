import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return new NextResponse("name is required", { status: 400 });
  }

  let avatarURL: string | null = null;

  try {
    const registryUrl = `https://registry.npmjs.org/-/v1/search?text=maintainer:${name}&size=100`;
    const res = await fetch(registryUrl, {
      next: { revalidate: 86400 }, // 24時間キャッシュする
    });

    if (res.ok) {
      const data = (await res.json()) as {
        objects: Array<{
          package: {
            maintainers?: Array<{ username: string; email?: string }>;
            publisher?: { username: string; email?: string };
          };
        }>;
      };

      let email: string | null = null;
      for (const obj of data.objects) {
        const maintainers = obj.package.maintainers || [];
        const match = maintainers.find((m) => m.username === name);
        if (match && match.email) {
          email = match.email;
          break;
        }
        const publisher = obj.package.publisher;
        if (publisher && publisher.username === name && publisher.email) {
          email = publisher.email;
          break;
        }
      }

      if (email) {
        const hash = crypto
          .createHash("md5")
          .update(email.toLowerCase().trim())
          .digest("hex");
        avatarURL = `https://www.gravatar.com/avatar/${hash}?s=250`;
      }
    }
  } catch (err) {
    console.error("Error fetching avatar from npm registry:", err);
  }

  // 取得できない場合は GitHub のアバターにフォールバック
  if (!avatarURL) {
    avatarURL = `https://github.com/${name}.png`;
  }

  return new NextResponse(avatarURL, { status: 200 });
};

