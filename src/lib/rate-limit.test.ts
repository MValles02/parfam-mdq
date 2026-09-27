import { describe, expect, it } from "vitest";
import { getClientIp } from "./rate-limit";

describe("getClientIp", () => {
  it("uses the CF-Connecting-IP header set by Cloudflare", () => {
    const headers = new Headers({ "cf-connecting-ip": "203.0.113.7" });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("ignores a spoofed X-Forwarded-For or X-Real-IP", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
    });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to a shared unknown bucket without the CF header", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(headers)).toBe("unknown");
  });
});
